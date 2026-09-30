import allureReporter from '@wdio/allure-reporter';
import type { Locator } from './locator.utils.js';

/** How long `clickAllIfExists` waits when probing for one more element to click. */
const CLICK_ALL_PROBE_TIMEOUT = 2_000;

export async function click(element: Locator): Promise<void> {
    const elementSelector = $(element.selector);
    const elementDescription = element.description;
    await elementSelector.waitForClickable({
        timeoutMsg: `❌ ${elementDescription} was not clickable before timeout.`,
    });
    await elementSelector.click();
    await allureReporter.addStep(`🥾 Clicked ${elementDescription}`);
}

export async function setValue(element: Locator, valueToSend: string): Promise<void> {
    const elementSelector = $(element.selector);
    const elementDescription = element.description;
    await elementSelector.waitForEnabled({
        timeoutMsg: `❌ ${elementDescription} was not enabled before timeout.`,
    });
    await elementSelector.setValue(valueToSend);
    await allureReporter.addStep(`⌨ Set ${elementDescription} to "${valueToSend}"`);
}

export async function selectOptionFromSelect(element: Locator, attribute: string, value: string): Promise<void> {
    const elementSelector = $(element.selector);
    const elementDescription = element.description;
    await elementSelector.waitForDisplayed({
        timeoutMsg: `❌ ${elementDescription} was not visible before timeout.`,
    });
    await elementSelector.selectByAttribute(attribute, value);
    await allureReporter.addStep(`🔽 Selected "${value}" in ${elementDescription}`);
}

export async function getText(element: Locator): Promise<string> {
    const elementSelector = $(element.selector);
    const elementDescription = element.description;
    await elementSelector.waitForDisplayed({
        timeoutMsg: `❌ ${elementDescription} was not visible before timeout`,
    });
    const textFromElement = await elementSelector.getText();
    await allureReporter.addStep(`👀 Read ${elementDescription}: "${textFromElement}"`);
    return textFromElement;
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
 * element it hit.
 *
 * The loop is bounded by the number of elements present when it starts. An
 * unbounded loop spins until the Mocha timeout whenever a click fails to
 * remove its element, reporting a 60s timeout instead of the real problem.
 */
export async function clickAllIfExists(element: Locator): Promise<void> {
    const initialCount = await countElements(element);

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
    await allureReporter.addStep(`🧹 Clicked every ${element.description} until none remained (${initialCount})`);
}
