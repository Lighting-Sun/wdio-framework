import Header from '../components/header.component.js';
import * as actions from '../utils/elementActions.utils.js';
import * as expectations from '../utils/elementExpectations.utils.js';
import Page from './page.js';

class OverviewPage extends Page {
    header = new Header();

    locators = {
        finishButton: {
            selector: '#finish',
            description: 'finish purchase button',
        },
        overviewItemNames: {
            selector: "div[data-test='inventory-item-name']",
            description: 'overview page item name',
        },
        overviewItemPrices: {
            selector: "div[data-test='inventory-item-price']",
            description: 'overview page item price',
        },
        overviewItemDescriptions: {
            selector: "div[data-test='inventory-item-desc']",
            description: 'overview page item description',
        },
        subTotalLabel: {
            selector: "div[data-test='subtotal-label']",
            description: 'sub total label',
        },
        taxLabel: {
            selector: "div[data-test='tax-label']",
            description: 'tax label in the price total summary',
        },
        totalLabel: {
            selector: "div[data-test='total-label']",
            description: 'total label (item total plus tax) in the price total summary',
        },
    };

    async getValuesFromPrices(): Promise<number[]> {
        const textFromPrices = await actions.getTextFromElements(this.locators.overviewItemPrices);
        return textFromPrices.map((textToTrim) => textToTrim.slice(1)).map(Number);
    }

    async getTextFromPrices(): Promise<string[]> {
        return await actions.getTextFromElements(this.locators.overviewItemPrices);
    }

    async getItemOverviewNames(): Promise<string[]> {
        return await actions.getTextFromElements(this.locators.overviewItemNames);
    }

    async expectItemOverviewNames(expectedNames: string[]): Promise<void> {
        await expectations.expectTextsFromElements(this.locators.overviewItemNames, expectedNames);
    }

    async expectItemOverviewPrices(expectedPrices: string[]): Promise<void> {
        await expectations.expectTextsFromElements(this.locators.overviewItemPrices, expectedPrices);
    }

    async expectItemOverviewDescriptions(expectedDescriptions: string[]): Promise<void> {
        await expectations.expectTextsFromElements(this.locators.overviewItemDescriptions, expectedDescriptions);
    }

    async expectSubTotalText(expectedText: string): Promise<void> {
        await expectations.expectText(this.locators.subTotalLabel, expectedText);
    }

    async expectTaxText(expectedText: string): Promise<void> {
        await expectations.expectText(this.locators.taxLabel, expectedText);
    }

    async expectTotalText(expectedText: string): Promise<void> {
        await expectations.expectText(this.locators.totalLabel, expectedText);
    }

    async getSubTotalValue(): Promise<number> {
        const subTotalText = (await actions.getText(this.locators.subTotalLabel)).replace('Item total: $', '');
        return Number(subTotalText);
    }

    async clickOnFinishButton(): Promise<void> {
        await actions.click(this.locators.finishButton);
    }
}

export default new OverviewPage();
