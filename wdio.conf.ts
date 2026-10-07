import allure from 'allure-commandline';
import allureReporter from '@wdio/allure-reporter';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';

const argv = yargs(process.argv.slice(2)).parseSync();

const allureDir = './reports/allure';

const selectedEnv = (argv['env'] as string | undefined) ?? 'qa';
const environments: Record<string, string> = {
    qa: 'https://www.saucedemo.com/',
    dev: 'https://www.saucedemo.com/v1/',
};
const effectiveEnv = selectedEnv in environments ? selectedEnv : 'qa';
const baseUrl = environments[effectiveEnv];

/**
 * `HEADED=1` shows the browser window, for watching a local run. It is ignored
 * when `CI` is set (GitHub Actions always sets it), so a stray variable can't
 * make CI try to open a window on a runner that has no display.
 */
const headed = process.env.HEADED === '1' && !process.env.CI;

const runInBrowser = (argv['browser'] as string | undefined) ?? 'chrome';
const browserCap: Record<string, object> = {
    chrome: {
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: headed ? ['disable-gpu'] : ['headless', 'disable-gpu'],
        },
    },
    firefox: {
        browserName: 'firefox',
        'moz:firefoxOptions': {
            args: headed ? [] : ['-headless'],
        },
    },
};

const effectiveBrowser = runInBrowser in browserCap ? runInBrowser : 'chrome';
const selectedBrowserCap = browserCap[effectiveBrowser];

/**
 * Failure buckets for the report's Categories tab, matched top to bottom on
 * the error message. They key off the messages elementActions.utils.ts and
 * locator.utils.ts throw, so the first question on a red run (the app, or
 * the test?) is answered before anyone opens a stack trace. A failure no rule
 * matches falls into Allure's default Product/Test defects buckets.
 */
const ALLURE_CATEGORIES = [
    {
        name: 'Test defect: dynamic locator rejected',
        messageRegex: '(?s).*Cannot substitute.*',
    },
    {
        name: 'Element never became ready (locator, timing or app state)',
        messageRegex: '(?s).*was not (clickable|enabled|visible) before timeout.*',
    },
    {
        name: 'Page showed the wrong value (possible product defect)',
        matchedStatuses: ['failed'],
        messageRegex: '(?s).*(Expect \\$|expect\\(received\\)|Expected).*',
    },
];

/**
 * Browser console output for the current test, collected over WebDriver BiDi
 * and attached when the test fails. Reset per test in `beforeTest`.
 */
let consoleEntries: string[] = [];

/** Where an `@KAN-123` tag in a test title links to in the Allure report. */
const JIRA_ISSUE_URL_TEMPLATE = 'https://harveydavid14.atlassian.net/browse/{}';

/** `@KAN-123`-style tags name the Jira ticket a test was written from. */
const JIRA_KEY_TAG = /^[A-Z][A-Z0-9]+-\d+$/;

/** Retry budget per spec file. Referenced by `onWorkerEnd` to detect flakes. */
const SPEC_FILE_RETRIES = 1;

/**
 * `error` is right locally, where a failing run is in front of you, and wrong
 * in CI, where the log is all you get. Driven by an env var so CI can raise it
 * without a code change.
 */
type WdioLogLevel = NonNullable<WebdriverIO.Config['logLevel']>;
const LOG_LEVELS: readonly WdioLogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];
const envLogLevel = process.env.WDIO_LOG_LEVEL as WdioLogLevel | undefined;
const logLevel: WdioLogLevel = envLogLevel && LOG_LEVELS.includes(envLogLevel) ? envLogLevel : 'error';

export const config: WebdriverIO.Config = {
    runner: 'local',
    specs: ['./tests/specs/**/*.ts'],
    suites: {
        regression: [
            './tests/specs/cart.spec.ts',
            './tests/specs/completePurchase.spec.ts',
            './tests/specs/inventorySort.spec.ts',
            './tests/specs/login.spec.ts',
        ],
        loginAndPurchase: ['./tests/specs/login.spec.ts', './tests/specs/completePurchase.spec.ts'],
    },
    exclude: [],
    maxInstances: 10,
    baseUrl,
    capabilities: [selectedBrowserCap],
    logLevel,
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    /**
     * Retry a failed spec file once, after the rest of the run finishes, so a
     * transient failure does not fail the whole build. `onWorkerEnd` below
     * reports every retry: a retry that nobody sees is a muted test.
     */
    specFileRetries: SPEC_FILE_RETRIES,
    specFileRetriesDeferred: true,

    framework: 'mocha',

    reporters: [
        'spec',
        [
            'allure',
            {
                outputDir: allureDir + '/allure-results',
                disableWebdriverStepsReporting: true,
                disableWebdriverScreenshotsReporting: true,
                issueLinkTemplate: JIRA_ISSUE_URL_TEMPLATE,
                // Shown in the report's Environment panel. The effective values, after
                // an unknown --env or --browser has fallen back to its default.
                reportedEnvironmentVars: {
                    Environment: effectiveEnv,
                    'Base URL': baseUrl,
                    Browser: effectiveBrowser,
                    Headed: String(headed),
                    Node: process.version,
                },
            },
        ],
    ],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    onPrepare: function () {
        const dir = allureDir;
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true });
                console.log(`🗑 ${dir} is deleted`);
            }
        } catch {
            console.log('⚠ error while deleting this dir');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('✔ dir got created');
            }
        }
        const resultsDir = allureDir + '/allure-results';
        fs.mkdirSync(resultsDir, { recursive: true });
        fs.writeFileSync(path.join(resultsDir, 'categories.json'), JSON.stringify(ALLURE_CATEGORIES, null, 2));
    },

    /** Starts collecting console output. Without BiDi there is nothing to collect, so it is skipped. */
    before: async function () {
        if (!browser.isBidi) {
            return;
        }
        await browser.sessionSubscribe({ events: ['log.entryAdded'] });
        browser.on('log.entryAdded', (entry) => {
            consoleEntries.push(`[${entry.level}] ${entry.text ?? ''}`);
        });
    },

    /**
     * Makes retries visible. A spec that only passes on its second attempt is
     * flaky, and that fact has to reach a human — otherwise `specFileRetries`
     * quietly hides exactly the failures worth investigating.
     */
    onWorkerEnd: function (cid: string, exitCode: number, specs: string[], retries: number) {
        // `retries` is the budget REMAINING, not the number used, so a worker
        // that never failed still reports the full budget here.
        const retriesUsed = SPEC_FILE_RETRIES - retries;
        if (retriesUsed > 0) {
            const outcome = exitCode === 0 ? 'passed on retry — FLAKY' : 'still failed after retrying';
            console.log(`⚠ ${specs.join(', ')} [${cid}] was retried ${retriesUsed}x and ${outcome}.`);
        }
    },

    /**
     * Turns the tags in a test title into Allure labels, so the report can be
     * filtered and grouped without any Allure call in a spec: `@KAN-4` links
     * the Jira ticket, every other tag (`@smoke`, `@journey`) becomes an
     * Allure tag, `@smoke` also marks the test critical, and the `describe`
     * title becomes the feature.
     */
    beforeTest: async function (test: { title: string; parent: string }) {
        consoleEntries = [];
        const tags: string[] = test.title.match(/@[\w-]+/g) ?? [];
        for (const tag of tags.map((t) => t.slice(1))) {
            if (JIRA_KEY_TAG.test(tag)) {
                await allureReporter.addIssue(tag);
            } else {
                await allureReporter.addTag(tag);
            }
        }
        await allureReporter.addSeverity(tags.includes('@smoke') ? 'critical' : 'normal');
        await allureReporter.addFeature(test.parent);
    },

    afterTest: async function (_test: unknown, _context: unknown, { passed }: { passed: boolean }) {
        if (passed) {
            return;
        }
        const screenshot = await browser.takeScreenshot();
        // Must be awaited: afterTest resolving before the attachment is written
        // can lose the screenshot during teardown, which defeats the purpose of this hook.
        await allureReporter.addAttachment('Screenshot on failure', Buffer.from(screenshot, 'base64'), 'image/png');
        await allureReporter.addAttachment('Page URL on failure', await browser.getUrl(), 'text/plain');
        if (consoleEntries.length > 0) {
            await allureReporter.addAttachment(
                'Browser console during the test',
                consoleEntries.join('\n'),
                'text/plain',
            );
        }
    },

    onComplete: function () {
        const timeOutTimer = 60_000;
        const reportError = new Error('Could not generate Allure report');
        const generation = allure([
            'generate',
            allureDir + '/allure-results',
            '--clean',
            '-o',
            allureDir + '/allure-report',
        ]);
        return new Promise<void>((resolve, reject) => {
            const generationTimeout = setTimeout(() => reject(reportError), timeOutTimer);

            generation.on('exit', function (exitCode: number) {
                clearTimeout(generationTimeout);

                if (exitCode !== 0) {
                    return reject(reportError);
                }

                console.log('Allure report successfully generated');
                resolve();
            });
        });
    },
};
