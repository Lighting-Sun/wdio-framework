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

    async click(objElement: Locator): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
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
    async getSelectorByValue(objElement: Locator, strValue: string | number): Promise<Locator> {
        const valueStr = String(strValue);

        if (!objElement.selector.includes(VALUE_PLACEHOLDER)) {
            throw new Error(
                `❌ Cannot substitute "${valueStr}": the locator for ${objElement.description} has no ${VALUE_PLACEHOLDER} placeholder. Selector: ${objElement.selector}`
            );
        }

        if (UNSAFE_VALUE_CHARS.test(valueStr)) {
            throw new Error(
                `❌ Cannot substitute "${valueStr}" into the locator for ${objElement.description}: quote characters would produce an invalid selector.`
            );
        }

        return {
            selector: objElement.selector.replaceAll(VALUE_PLACEHOLDER, valueStr),
            description: objElement.description.replaceAll(VALUE_PLACEHOLDER, valueStr),
        };
    }

    async setValue(objElement: Locator, strValueToSend: string): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForEnabled({ timeoutMsg: `❌ ${elementDescription} was not enabled before timeout.` });
        await elementSelector.setValue(strValueToSend);
        allureReporter.addStep(`⌨ Set ${elementDescription} to "${strValueToSend}"`);
    }

    async getText(objElement: Locator): Promise<string> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout` });
        const textFromElement = await elementSelector.getText();
        allureReporter.addStep(`👀 Read ${elementDescription}: "${textFromElement}"`);
        return textFromElement;
    }

    async getElements(objElements: Locator): Promise<WebdriverIO.Element[]> {
        return (await $$(objElements.selector)) as unknown as WebdriverIO.Element[];
    }

    async getTextFromElements(objElements: Locator): Promise<string[]> {
        return await $$(objElements.selector).map(element => element.getText()) as unknown as Promise<string[]>;
    }

    /**
     * Asserts on the ELEMENT, not on an already-resolved string, so
     * expect-webdriverio re-queries the DOM until the text matches or
     * `waitforTimeout` elapses. Use this instead of
     * `expect(await getText()).toEqual(...)`, which only checks once.
     */
    async expectText(objElement: Locator, strExpectedText: string): Promise<void> {
        await expect($(objElement.selector)).toHaveText(strExpectedText);
        allureReporter.addStep(`✅ ${objElement.description} has text "${strExpectedText}"`);
    }

    /**
     * Retrying equivalent for a group of elements. Polls until the collected
     * texts match, then asserts once more so a failure reports a readable diff
     * rather than a bare `waitUntil` timeout.
     */
    async expectTextsFromElements(objElements: Locator, arrExpectedTexts: string[]): Promise<void> {
        let actualTexts: string[] = [];

        await browser.waitUntil(
            async () => {
                actualTexts = await this.getTextFromElements(objElements);
                return actualTexts.length === arrExpectedTexts.length
                    && actualTexts.every((text, index) => text === arrExpectedTexts[index]);
            },
            {
                timeout: TEXTS_RETRY_TIMEOUT,
                timeoutMsg: `❌ ${objElements.description} never matched the expected texts.`,
            }
        ).catch(() => undefined);

        expect(actualTexts).toEqual(arrExpectedTexts);
        allureReporter.addStep(`✅ ${objElements.description} matches ${arrExpectedTexts.length} expected value(s)`);
    }

    async selectOptionFromSelect(objElement: Locator, strAttr: string, srtValue: string): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout.` });
        await elementSelector.selectByAttribute(strAttr, srtValue);
        allureReporter.addStep(`🔽 Selected "${srtValue}" in ${elementDescription}`);
    }

    async clickAllIfExists(objElement: Locator): Promise<void> {
        let element = await $(objElement.selector);
        let isClickable: boolean = await element.waitForClickable({ timeout: CLICK_ALL_PROBE_TIMEOUT }).catch(() => false);

        while (isClickable) {
            await this.click(objElement);
            element = await $(objElement.selector);
            isClickable = await element.waitForClickable({ timeout: CLICK_ALL_PROBE_TIMEOUT }).catch(() => false);
        }
        allureReporter.addStep(`🧹 Clicked every ${objElement.description} until none remained`);
    }
}
