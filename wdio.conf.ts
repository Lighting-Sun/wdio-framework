import allure from "allure-commandline";
import allureReporter from "@wdio/allure-reporter";
import fs from 'fs';
import yargs from "yargs";

const argv = yargs(process.argv.slice(2)).parseSync();

const allureDir = "./reports/allure";

const selectedEnv = (argv['env'] as string | undefined) ?? 'qa';
const environments: Record<string, string> = {
    qa: 'https://www.saucedemo.com/',
    dev: 'https://www.saucedemo.com/v1/',
};
const baseUrl = environments[selectedEnv] ?? environments['qa'];

const runInBrowser = (argv['browser'] as string | undefined) ?? 'chrome';
const browserCap: Record<string, object> = {
    chrome: {
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['headless', 'disable-gpu']
        }
    },
    firefox: {
        browserName: 'firefox',
        'moz:firefoxOptions': {
            args: ['-headless']
        }
    }
};

const selectedBrowserCap = browserCap[runInBrowser] ?? browserCap['chrome'];

/** Retry budget per spec file. Referenced by `onWorkerEnd` to detect flakes. */
const SPEC_FILE_RETRIES = 1;

export const config: WebdriverIO.Config = {
    runner: 'local',
    specs: [
        './tests/specs/**/*.ts'
    ],
    suites: {
        regression: [
            './tests/specs/addProductsToCart.spec.ts',
            './tests/specs/completePurchase.spec.ts',
            './tests/specs/filter.spec.ts',
            './tests/specs/login.spec.ts'
        ],
        loginAndPurchase: [
            './tests/specs/login.spec.ts',
            './tests/specs/completePurchase.spec.ts'
        ]
    },
    exclude: [],
    maxInstances: 10,
    baseUrl,
    capabilities: [selectedBrowserCap],
    logLevel: 'error',
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

    reporters: ['spec', ['allure', {
        outputDir: allureDir + '/allure-results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: true,
    }]],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    onPrepare: function () {
        const dir = allureDir;
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true });
                console.log(`🗑 ${dir} is deleted`);
            }
        } catch {
            console.log("⚠ error while deleting this dir");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log("✔ dir got created");
            }
        }
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

    afterTest: async function (_test: unknown, _context: unknown, { passed }: { passed: boolean }) {
        if (passed) {
            return;
        }
        const screenshot = await browser.takeScreenshot();
        // Must be awaited: afterTest resolving before the attachment is written
        // can lose the screenshot during teardown, which is the whole point of #1.
        await allureReporter.addAttachment(
            'Screenshot on failure',
            Buffer.from(screenshot, 'base64'),
            'image/png'
        );
    },

    onComplete: function () {
        const timeOutTimer = 60_000;
        const reportError = new Error('Could not generate Allure report');
        const generation = allure(['generate', allureDir + '/allure-results', '--clean', '-o', allureDir + '/allure-report']);
        return new Promise<void>((resolve, reject) => {
            const generationTimeout = setTimeout(
                () => reject(reportError),
                timeOutTimer);

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
