import allureReporter from "@wdio/allure-reporter";

export interface Locator {
    selector: string;
    description: string;
}

export default class WdioFactoryUtils {

    async click(objElement: Locator): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForClickable({ timeoutMsg: `❌ ${elementDescription} was not clickable before timeout.` });
        await elementSelector.click();
        allureReporter.addAttachment(
            `🥾 ${objElement.description} is clicked`,
            `🥾 ${objElement.selector} is clicked`,
            "text/plain"
        );
    }

    async getSelectorByValue(objElement: Locator, strValue: string | number): Promise<Locator> {
        const valueStr = String(strValue);
        const elementSelector = objElement.selector.replace('${value}', valueStr);
        const elementDescription = objElement.description.replace('${value}', valueStr);
        allureReporter.addAttachment(
            `🥾 getting element dynamic selector with value ${elementDescription} `,
            `🥾 getting element dynamic selector ${elementSelector}`,
            "text/plain"
        );
        return {
            selector: elementSelector,
            description: elementDescription,
        };
    }

    async setValue(objElement: Locator, strValueToSend: string): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForEnabled({ timeoutMsg: `❌ ${elementDescription} was not enabled before timeout.` });
        await this.click(objElement);
        await elementSelector.setValue(strValueToSend);
        allureReporter.addAttachment(
            `🥾 setting value for element ${objElement.description} with value: ${strValueToSend}`,
            `🥾 setting value for element ${objElement.selector}`,
            "text/plain"
        );
    }

    async getText(objElement: Locator): Promise<string> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout` });
        const textFromElement = await elementSelector.getText();
        allureReporter.addAttachment(
            `🥾 Got text from ${objElement.description} with value: ${textFromElement}`,
            `🥾 Got text from ${objElement.selector}`,
            "text/plain"
        );
        return textFromElement;
    }

    async getElements(objElements: Locator): Promise<WebdriverIO.Element[]> {
        return (await $$(objElements.selector)) as unknown as WebdriverIO.Element[];
    }

    async getTextFromElements(objElements: Locator): Promise<string[]> {
        return await $$(objElements.selector).map(element => element.getText()) as unknown as Promise<string[]>;
    }

    async selectOptionFromSelect(objElement: Locator, strAttr: string, srtValue: string): Promise<void> {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not clickable before timeout.` });
        await elementSelector.selectByAttribute(strAttr, srtValue);
        allureReporter.addAttachment(
            `🥾 Select ${objElement.description} with option ${srtValue} was clicked`,
            `🥾 Element from select ${objElement.selector} was clicked`,
            "text/plain"
        );
    }

    async clickAllIfExists(objElement: Locator): Promise<void> {
        let element = await $(objElement.selector);
        let isClickable: boolean = await element.waitForClickable({ timeout: 1000 }).catch(() => false);

        while (isClickable) {
            await this.click(objElement);
            element = await $(objElement.selector);
            isClickable = await element.waitForClickable({ timeout: 1000 }).catch(() => false);
        }
        allureReporter.addAttachment(
            `🥾 all elements ${objElement.description} were clicked`,
            `🥾 all elements ${objElement.selector} were clicked`,
            "text/plain"
        );
        console.log("📢 There are no more elements to be clicked!");
    }
}
