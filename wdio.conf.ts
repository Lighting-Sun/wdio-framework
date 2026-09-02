import path from "node:path";
import allure from "allure-commandline";
import fs from 'fs';
import yargs from "yargs";

const argv = yargs(process.argv.slice(2)).parseSync();

let allureDir = "./reports/allure";

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

export const config = {
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
    logLevel: 'error' as const,
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    services: [
        [
            "visual",
            {
                baselineFolder: path.join(process.cwd(), "tests/visual-testing", "baseline"),
                formatImageName: "{tag}-{logName}-{width}x{height}",
                screenshotPath: path.join(process.cwd(), "tmp"),
                savePerInstance: true,
            },
        ],
    ],

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
        } catch (error) {
            console.log("⚠ error while deleting this dir");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log("✔ dir got created");
            }
        }
    },

    afterTest: async function (_test: unknown, _context: unknown, { passed }: { passed: boolean }) {
        if (!passed) {
            await browser.takeScreenshot();
        }
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
