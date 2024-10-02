import Header from '../components/header.component';
import Page from './page';

class Inventory extends Page {
    header = new Header();

    locators = {
        inventoryItemLabelFromName: {
            selector: "//div[text()='${value}']",
            description: "item label name '${value}'",
        },
        inventoryItemPrice: {
            selector: "div[class='inventory_item_price']",
            description: "inventory item price",
        },
        addToCartButtonBasedOnItemName: {
            selector: "//div[text()='${value}']/ancestor-or-self::div[@class='inventory_item_description']//button[text()='Add to cart']",
            description: "add to cart button based on item name '${value}'",
        }
    };

    async clickAddToCartByItemName(strItemName) {
        const element = await this.wdioFactory.getSelectorByValue(this.locators.addToCartButtonBasedOnItemName, strItemName);
        await this.wdioFactory.click(element);
    }

    async clickSelectContainer() {
        await this.wdioFactory.click(this.locators.sortFilterDropdown);
    }

    async getTextFromPrices() {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.inventoryItemPrice);
        const trimmedPrice = textFromPrices.map(textToTrim => textToTrim.slice(1));
        return trimmedPrice;
    }
}
export default new Inventory();
