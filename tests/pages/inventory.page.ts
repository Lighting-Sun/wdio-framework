import Header from '../components/header.component.js';
import UtilsMethods from '../utils/utilsMethods.utils.js';
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
        inventoryItemPriceIndex: {
            selector: "div[data-test='inventory-item']:nth-of-type(${value}) div[class='inventory_item_price']",
            description: "inventory item price based on index ${value}'",
        },
        inventoryItemNameIndex: {
            selector: "div[data-test='inventory-item']:nth-of-type(${value}) div[class='inventory_item_name ']",
            description: "inventory item name based on index ${value}'",
        },
        inventoryAddCartItemButtonIndex: {
            selector: "div[data-test='inventory-item']:nth-of-type(${value}) button[class*='btn_small']",
            description: "inventory item button based on index ${value}'",
        },
        inventoryItemCard: {
            selector: "div[data-test='inventory-item']",
            description: "inventory item name based on index'",
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

    async getInventoryPriceFromIndexText(index: number): Promise<string> {
        return await this.wdioFactory.getText(await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemPriceIndex, index));
    }

    async getInventoryNameFromIndexText(index: number): Promise<string> {
        return await this.wdioFactory.getText(await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemNameIndex, index));
    }

    async clickAddCartItemButtonFromIndex(index: number): Promise<void> {
        await this.wdioFactory.click(await this.wdioFactory.getSelectorByValue(this.locators.inventoryAddCartItemButtonIndex, index));
    }

    async AddItemToCartByIndex(index: number): Promise<ItemDetail> {
        const itemNameText = await this.getInventoryNameFromIndexText(index);
        const itemPriceText = await this.getInventoryPriceFromIndexText(index);
        await this.clickAddCartItemButtonFromIndex(index);
        return {
            itemName: itemNameText,
            itemPrice: itemPriceText,
        };
    }

    async getNumberOfItems(): Promise<number> {
        return (await this.wdioFactory.getElements(this.locators.inventoryItemCard)).length;
    }

    async addRandomItemsToCart(): Promise<ItemDetail[]> {
        const detailsPromises: ItemDetail[] = [];
        const numberOfItems = await this.getNumberOfItems();
        const indexesToAdd = UtilsMethods.getSetFromRange(1, numberOfItems, UtilsMethods.getRandomNumber(1, numberOfItems));

        for await (const index of indexesToAdd) {
            detailsPromises.push(await this.AddItemToCartByIndex(index));
        }
        return detailsPromises;
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
