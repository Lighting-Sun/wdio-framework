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

    async getValuesFromPrices() {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.overviewItemPrices);
        const trimmedPrice = textFromPrices.map(textToTrim => textToTrim.slice(1)).map(Number);
        return trimmedPrice;
    }

    async getTextFromPrices() {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.overviewItemPrices);;
        return textFromPrices;
    }

    async getItemOverviewNames() {
        const itemCartNames = await this.wdioFactory.getElements(this.locators.overviewItemNames);
        return await this.wdioFactory.getTextFromElements(itemCartNames);
    }

    async getSubTotalValue() {
        const subTotalText = (await this.wdioFactory.getText(this.locators.subTotalLabel)).replace('Item total: $', '');
        return Number(subTotalText);
    }

}

export default new OverviewPage();
