import allureReporter from "@wdio/allure-reporter";

export default class WdioFactoryUtils {

    async click(objElement) {
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

    async getSelectorByValue(objElement, strValue) {
        const elementSelector = await objElement.selector.replace('${value}', strValue);
        const elementDescription = await objElement.description.replace('${value}', strValue);
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

    async setValue(objElement, strValueToSend) {
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

    async getText(objElement) {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout` });
        allureReporter.addAttachment(
            `🥾 Got text from ${objElement.description}`,
            `🥾 Got text from ${objElement.selector}`,
            "text/plain"
        );
        return await elementSelector.getText();
    }

    async getElements(objElements) {
        const elementSelector = await $$(objElements.selector);
        //might need a wait of some sort...
        return elementSelector;
    }

    async getTextFromElements(webElements) {
        const elements = await this.getElements(webElements);
        const elementsText = await Promise.all(await elements.map(async element => await element.getText()));
        return elementsText;
    }

    async selectOptionFromSelect(objElement, strAttr, srtValue) {
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

    async clickAllIfExists(objElement) {
        let element = await $(objElement.selector);
        let isClickable = await element.waitForClickable({ timeout: 1000 }).catch(() => false);

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
