import type { Locator } from './locator.utils.js';
import { step } from './report.utils.js';

/** How long `clickAllIfExists` waits when probing for one more element to click. */
const CLICK_ALL_PROBE_TIMEOUT = 2_000;

/** What the report shows in place of a value typed into a `sensitive` locator. */
const MASKED_VALUE = '••••••';

export async function click(element: Locator): Promise<void> {
    await step(`🥾 Click ${element.description}`, async () => {
        const elementSelector = $(element.selector);
        await elementSelector.waitForClickable({
            timeoutMsg: `❌ ${element.description} was not clickable before timeout.`,
        });
        await elementSelector.click();
    });
}

/**
 * The value is shown in the step name unless the locator is `sensitive`, so a
 * password never reaches the report or the CI artifact that carries it.
 */
export async function setValue(element: Locator, valueToSend: string): Promise<void> {
    const shownValue = element.sensitive ? MASKED_VALUE : valueToSend;
    await step(`⌨ Set ${element.description} to "${shownValue}"`, async () => {
        const elementSelector = $(element.selector);
        await elementSelector.waitForEnabled({
            timeoutMsg: `❌ ${element.description} was not enabled before timeout.`,
        });
        await elementSelector.setValue(valueToSend);
    });
}

export async function selectOptionFromSelect(element: Locator, attribute: string, value: string): Promise<void> {
    await step(`🔽 Select "${value}" in ${element.description}`, async () => {
        const elementSelector = $(element.selector);
        await elementSelector.waitForDisplayed({
            timeoutMsg: `❌ ${element.description} was not visible before timeout.`,
        });
        await elementSelector.selectByAttribute(attribute, value);
    });
}

/** The step is renamed to include the text once it has been read. */
export async function getText(element: Locator): Promise<string> {
    return await step(`👀 Read ${element.description}`, async (context) => {
        const elementSelector = $(element.selector);
        await elementSelector.waitForDisplayed({
            timeoutMsg: `❌ ${element.description} was not visible before timeout`,
        });
        const textFromElement = await elementSelector.getText();
        await context.displayName(`👀 Read ${element.description}: "${textFromElement}"`);
        return textFromElement;
    });
}

/**
 * One attribute of one element, read once, or null when the element has
 * no such attribute. Logs nothing: it is meant to feed a retrying
 * `expectEventuallyEquals`, which would otherwise log every re-read.
 */
export async function getAttribute(element: Locator, attribute: string): Promise<string | null> {
    return await $(element.selector).getAttribute(attribute);
}

export async function getTextFromElements(elements: Locator): Promise<string[]> {
    return (await $$(elements.selector).map((element) => element.getText())) as unknown as Promise<string[]>;
}

/**
 * How many elements match right now. Returns a number rather than the
 * elements themselves so raw WebdriverIO elements never leave this module.
 */
export async function countElements(elements: Locator): Promise<number> {
    return await $$(elements.selector).length;
}

/**
 * Clicks every element matching the locator, assuming each click removes the
 * element it hit. Each click is its own step, nested under this one.
 *
 * The loop is bounded by the number of elements present when it starts. An
 * unbounded loop spins until the Mocha timeout whenever a click fails to
 * remove its element, reporting a 60s timeout instead of the real problem.
 */
export async function clickAllIfExists(element: Locator): Promise<void> {
    await step(`🧹 Click every ${element.description} until none remain`, async (context) => {
        const initialCount = await countElements(element);
        await context.displayName(`🧹 Click every ${element.description} until none remain (${initialCount})`);

        for (let clicks = 0; clicks < initialCount; clicks++) {
            const probe = $(element.selector);
            const isClickable: boolean = await probe
                .waitForClickable({ timeout: CLICK_ALL_PROBE_TIMEOUT })
                .catch(() => false);
            if (!isClickable) {
                break;
            }
            await click(element);
        }

        // Clicking the last element and the DOM dropping it are not the same
        // instant, so settle rather than counting straight away.
        await browser.waitUntil(async () => (await countElements(element)) === 0, {
            timeout: CLICK_ALL_PROBE_TIMEOUT,
            timeoutMsg: `❌ ${element.description}: ${initialCount} were present and each was clicked, but some remain. A click is not removing its element.`,
        });
    });
}
