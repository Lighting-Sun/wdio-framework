import Header from '../components/header.component.js';
import Page from './page.js';

type ItemDetail = { itemName: string; itemPrice: string };

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
        },
        inventoryItemNameByName: {
            selector: "//div[text()='${value}']",
            description: "inventory item name based on ${value}'",
        },
        inventoryItemPriceByName: {
            selector: "//div[text()='${value}']/ancestor-or-self::div[@data-test='inventory-item-description']//div[@data-test='inventory-item-price']",
            description: "inventory item price based on ${value}'",
        },
        inventoryAddToCartButtonByName: {
            selector: "//div[text()='${value}']/ancestor-or-self::div[@data-test='inventory-item-description']//button",
            description: "inventory item price based on ${value}'",
        }
    };

    async clickAddToCartByItemName(strItemName: string): Promise<void> {
        const element = await this.wdioFactory.getSelectorByValue(this.locators.addToCartButtonBasedOnItemName, strItemName);
        await this.wdioFactory.click(element);
    }

    async getTextFromPrices(): Promise<string[]> {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.inventoryItemPrice);
        return textFromPrices.map(textToTrim => textToTrim.slice(1));
    }

    /**
     * Adds a fixed, caller-supplied list of products. Replaces the previous
     * random selection: a failure here names the exact products involved and
     * re-runs identically.
     */
    async addItemsToCartByNames(arrItemNames: string[]): Promise<ItemDetail[]> {
        const itemDetails: ItemDetail[] = [];
        for (const itemName of arrItemNames) {
            itemDetails.push(await this.AddItemToCartByName(itemName));
        }
        return itemDetails;
    }

    async getProperyValuesFromArrayOfDetails(arrOfItemDetail: ItemDetail[], strPropertyToGet: keyof ItemDetail): Promise<string[]> {
        return arrOfItemDetail.map(detail => detail[strPropertyToGet]);
    }

    async getInventoryItemNameByNameText(value: string): Promise<string> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemNameByName, value);
        return await this.wdioFactory.getText(selector);
    }

    async getInventoryItemPriceByNameText(value: string): Promise<string> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemPriceByName, value);
        return await this.wdioFactory.getText(selector);
    }

    async clickInventoryItemAddToCartByName(value: string): Promise<void> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryAddToCartButtonByName, value);
        await this.wdioFactory.click(selector);
    }

    async AddItemToCartByName(value: string): Promise<ItemDetail> {
        const itemNameText = await this.getInventoryItemNameByNameText(value);
        const itemPriceText = await this.getInventoryItemPriceByNameText(value);
        await this.clickInventoryItemAddToCartByName(value);
        return {
            itemName: itemNameText,
            itemPrice: itemPriceText,
        };
    }
}

export default new Inventory();
