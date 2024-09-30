

export default class WdioFactoryUtils {

    async click(objElement) {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForClickable({ timeoutMsg: `❌ ${elementDescription} was not clickable before timeout.` });
        await elementSelector.click();
    }

    async getElementByValue(objElement, strValue) {
        const elementSelector = $(objElement.selector.replace('${value}', strValue));
        const elementDescription = $(objElement.selector.replace('${value}', strValue));
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
    }

    async getText(objElement) {
        const elementSelector = $(objElement.selector);
        const elementDescription = objElement.description;
        await elementSelector.waitForDisplayed({ timeoutMsg: `❌ ${elementDescription} was not visible before timeout` });
        return await elementSelector.getText();
    }
}