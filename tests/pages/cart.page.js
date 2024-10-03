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
        }
    };

    async getItemCartNames() {
        const itemCartNames = await this.wdioFactory.getElements(this.locators.itemCartNames);
        return await this.wdioFactory.getTextFromElements(itemCartNames);
    }

    async getItemCartPrices() {
        const itemCartPrices = await this.wdioFactory.getElements(this.locators.itemCartPrices);
        return await this.wdioFactory.getTextFromElements(itemCartPrices);
    }

}

export default new CartPage();
