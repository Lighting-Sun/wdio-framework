import Header from '../components/header.component.js';
import UtilsMethods from '../utils/utilsMethods.utils.js';
import Page from './page.js';

class CartPage extends Page {
    header = new Header();

    locators = {
        itemCartNames: {
            selector: "div[data-test='inventory-item-name']",
            description: 'item names in cart',
        },
        itemCartPrices: {
            selector: "div[data-test='inventory-item-price']",
            description: 'item prices in cart',
        },
        itemCartRemoveButton: {
            selector: "button[data-test^='remove']",
            description: 'item remove from cart button',
        },
        itemCartRemoveButtonByName: {
            selector: "button[data-test='remove-${value}']",
            description: "remove button in cart for '${value}'",
        },
        checkoutButton: {
            selector: "button[data-test='checkout']",
            description: 'checkout button',
        },
    };

    async getItemCartNames(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.itemCartNames);
    }

    async getItemCartPrices(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.itemCartPrices);
    }

    async expectItemCartNames(expectedNames: string[]): Promise<void> {
        await this.wdioFactory.expectTextsFromElements(this.locators.itemCartNames, expectedNames);
    }

    async expectItemCartPrices(expectedPrices: string[]): Promise<void> {
        await this.wdioFactory.expectTextsFromElements(this.locators.itemCartPrices, expectedPrices);
    }

    async removeAllItemsFromCart(): Promise<void> {
        await this.wdioFactory.clickAllIfExists(this.locators.itemCartRemoveButton);
        await browser.waitUntil(
            async () => {
                const elementCount = (await this.wdioFactory.getElements(this.locators.itemCartRemoveButton)).length;
                return elementCount === 0;
            },
            { timeoutMsg: `💥 ${this.locators.itemCartRemoveButton.description} was found!, none should be existent` },
        );
    }

    async removeItemFromCartByName(value: string): Promise<void> {
        const selector = this.wdioFactory.getSelectorByValue(
            this.locators.itemCartRemoveButtonByName,
            UtilsMethods.toProductSlug(value),
        );
        await this.wdioFactory.click(selector);
    }

    async clickOnCheckoutButton(): Promise<void> {
        await this.wdioFactory.click(this.locators.checkoutButton);
    }
}

export default new CartPage();
