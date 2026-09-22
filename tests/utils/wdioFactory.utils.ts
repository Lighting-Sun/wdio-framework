import allureReporter from "@wdio/allure-reporter";

export interface Locator {
    selector: string;
    description: string;
}

/** Token that dynamic locators substitute a runtime value into. */
const VALUE_PLACEHOLDER = '${value}';

/**
 * Quote characters would terminate the quoted section of a selector early and
 * produce an invalid one. Escaping them properly needs XPath `concat()`, which
 * a plain string substitution cannot express, so such values are rejected.
 */
const UNSAFE_VALUE_CHARS = /['"]/;

/** How long a group-of-elements assertion keeps re-reading the DOM before failing. */
const TEXTS_RETRY_TIMEOUT = 10_000;

/** How long `clickAllIfExists` waits when probing for one more element to click. */
const CLICK_ALL_PROBE_TIMEOUT = 2_000;

export default class WdioFactoryUtils {

    async click(element: Locator): Promise<void> {
        const elementSelector = $(element.selector);
        const elementDescription = element.description;
        await elementSelector.waitForClickable({ timeoutMsg: `❌ ${elementDescription} was not clickable before timeout.` });
        await elementSelector.click();
        allureReporter.addStep(`🥾 Clicked ${elementDescription}`);
    }

    /**
     * Substitutes a runtime value into a dynamic locator.
     *
     * Both failure modes below used to pass silently and surface later as a
     * confusing "element not found", pointing at the page object rather than
     * at the bad input.
     */
    async getSelectorByValue(element: Locator, value: string | number): Promise<Locator> {
        const valueStr = String(value);

        if (!element.selector.includes(VALUE_PLACEHOLDER)) {
            throw new Error(
                `❌ Cannot substitute "${valueStr}": the locator for ${element.description} has no ${VALUE_PLACEHOLDER} placeholder. Selector: ${element.selector}`
            );
        }

        if (UNSAFE_VALUE_CHARS.test(valueStr)) {
            throw new Error(
                `❌ Cannot substitute "${valueStr}" into the locator for ${element.description}: quote characters would produce an invalid selector.`
            );
        }

        return {
            selector: element.selector.replaceAll(VALUE_PLACEHOLDER, valueStr),
            description: element.description.replaceAll(VALUE_PLACEHOLDER, valueStr),
        };
    }

    async setValue(element: Locator, valueToSend: string): Promise<void> {
        const elementSelector = $(element.selector);
        const elementDescription = element.description;
        await elementSelector.waitForEnabled({ timeoutMsg: `❌ ${elementDescription} was not enabled before timeout.` });
        await elementSelector.setValue(valueToSend);
        allureReporter.addStep(`⌨ Set ${elementDescription} to "${valueToSend}"`);
    }

    async getText(element: Locator): Promise<string> {
        const elementSelector = $(element.selector);
        const elementDescription = element.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout` });
        const textFromElement = await elementSelector.getText();
        allureReporter.addStep(`👀 Read ${elementDescription}: "${textFromElement}"`);
        return textFromElement;
    }

    async getElements(elements: Locator): Promise<WebdriverIO.Element[]> {
        return (await $$(elements.selector)) as unknown as WebdriverIO.Element[];
    }

    async getTextFromElements(elements: Locator): Promise<string[]> {
        return await $$(elements.selector).map(element => element.getText()) as unknown as Promise<string[]>;
    }

    /**
     * Asserts on the ELEMENT, not on an already-resolved string, so
     * expect-webdriverio re-queries the DOM until the text matches or
     * `waitforTimeout` elapses. Use this instead of
     * `expect(await getText()).toEqual(...)`, which only checks once.
     */
    async expectText(element: Locator, expectedText: string): Promise<void> {
        await expect($(element.selector)).toHaveText(expectedText);
        allureReporter.addStep(`✅ ${element.description} has text "${expectedText}"`);
    }

    /**
     * Re-reads `readValues` until it matches `expected`, then asserts once
     * more so a failure reports a readable diff rather than a bare `waitUntil`
     * timeout.
     *
     * Use this whenever the expected side is itself collected from the page
     * (a sorted list, a cart compared against what was added). A plain
     * `expect(a).toEqual(b)` on two collected arrays reads the DOM once and
     * races whatever re-render the last action triggered.
     */
    async expectEventuallyEquals<T>(label: string, readValues: () => Promise<T[]>, expected: T[]): Promise<void> {
        let actualValues: T[] = [];

        await browser.waitUntil(
            async () => {
                actualValues = await readValues();
                return actualValues.length === expected.length
                    && actualValues.every((value, index) => value === expected[index]);
            },
            {
                timeout: TEXTS_RETRY_TIMEOUT,
                timeoutMsg: `❌ ${label} never matched the expected values.`,
            }
        ).catch(() => undefined);

        expect(actualValues).toEqual(expected);
        allureReporter.addStep(`✅ ${label} matches ${expected.length} expected value(s)`);
    }

    /** Retrying equivalent of reading a group of elements and comparing their text. */
    async expectTextsFromElements(elements: Locator, expectedTexts: string[]): Promise<void> {
        await this.expectEventuallyEquals(
            elements.description,
            () => this.getTextFromElements(elements),
            expectedTexts
        );
    }

    async selectOptionFromSelect(element: Locator, attribute: string, value: string): Promise<void> {
        const elementSelector = $(element.selector);
        const elementDescription = element.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout.` });
        await elementSelector.selectByAttribute(attribute, value);
        allureReporter.addStep(`🔽 Selected "${value}" in ${elementDescription}`);
    }

    /**
     * Clicks every element matching the locator, assuming each click removes the
     * element it hit.
     *
     * The loop is bounded by the number of elements present when it starts. An
     * unbounded loop spins until the Mocha timeout whenever a click fails to
     * remove its element, reporting a 60s timeout instead of the real problem.
     */
    async clickAllIfExists(element: Locator): Promise<void> {
        const initialCount = (await this.getElements(element)).length;

        for (let clicks = 0; clicks < initialCount; clicks++) {
            const probe = $(element.selector);
            const isClickable: boolean = await probe.waitForClickable({ timeout: CLICK_ALL_PROBE_TIMEOUT }).catch(() => false);
            if (!isClickable) { break; }
            await this.click(element);
        }

        // Clicking the last element and the DOM dropping it are not the same
        // instant, so settle rather than counting straight away.
        await browser.waitUntil(
            async () => (await this.getElements(element)).length === 0,
            {
                timeout: CLICK_ALL_PROBE_TIMEOUT,
                timeoutMsg: `❌ ${element.description}: ${initialCount} were present and each was clicked, but some remain. A click is not removing its element.`,
            }
        );
        allureReporter.addStep(`🧹 Clicked every ${element.description} until none remained (${initialCount})`);
    }
}
