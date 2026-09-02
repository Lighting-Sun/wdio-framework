import Header from '../components/header.component.js';
import Page from './page.js';

class CartPage extends Page {

    header = new Header();

    locators = {
        itemCartNames: {
            selector: "div[data-test='inventory-item-name']",
            description: "item names in cart",
        },
        itemCartPrices: {
            selector: "div[data-test='inventory-item-price']",
            description: "item prices in cart",
        },
        itemCartRemoveButton: {
            selector: "button[data-test^='remove']",
            description: "item remove from cart button"
        },
        checkoutButton: {
            selector: "button[data-test='checkout']",
            description: "checkout button"
        }
    };

    async getItemCartNames(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.itemCartNames);
    }

    async getItemCartPrices(): Promise<string[]> {
        return await this.wdioFactory.getTextFromElements(this.locators.itemCartPrices);
    }

    async removeAllItemsFromCart(): Promise<void> {
        await this.wdioFactory.clickAllIfExists(this.locators.itemCartRemoveButton);
        await browser.waitUntil(async () => {
            const elementCount = (await this.wdioFactory.getElements(this.locators.itemCartRemoveButton)).length;
            return elementCount === 0;
        }, { timeoutMsg: `💥 ${this.locators.itemCartRemoveButton.description} was found!, none should be existent` });
    }

    async clickOnCheckoutButton(): Promise<void> {
        await this.wdioFactory.click(this.locators.checkoutButton);
    }
}

export default new CartPage();
