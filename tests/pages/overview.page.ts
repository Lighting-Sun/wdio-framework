import Header from '../components/header.component.js';
import Page from './page.js';

class OverviewPage extends Page {

    header = new Header();

    locators = {
        finishButton: {
            selector: "#finish",
            description: "finish purchase button",
        },
        overviewItemNames: {
            selector: "div[data-test='inventory-item-name']",
            description: "overview page item name",
        },
        overviewItemPrices: {
            selector: "div[data-test='inventory-item-price']",
            description: "overview page item price",
        },
        subTotalLabel: {
            selector: "div[data-test='subtotal-label']",
            description: "sub total label",
        },
    };

    async getValuesFromPrices(): Promise<number[]> {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.overviewItemPrices);
        return textFromPrices.map(textToTrim => textToTrim.slice(1)).map(Number);
    }

    async getTextFromPrices(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.overviewItemPrices);
    }

    async getItemOverviewNames(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.overviewItemNames);
    }

    async getSubTotalValue(): Promise<number> {
        const subTotalText = (await this.wdioFactory.getText(this.locators.subTotalLabel)).replace('Item total: $', '');
        return Number(subTotalText);
    }

    async clickOnFinishButton(): Promise<void> {
        await this.wdioFactory.click(this.locators.finishButton);
    }
}

export default new OverviewPage();
