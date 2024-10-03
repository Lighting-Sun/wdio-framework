import Header from '../components/header.component';
import UtilsMethods from '../utils/utilsMethods.utils';
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

    async getInventoryPriceFromIndexText(index) {
        return await this.wdioFactory.getText(await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemPriceIndex, index));
    }

    async getInventoryNameFromIndexText(index) {
        return await this.wdioFactory.getText(await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemNameIndex, index));
    }

    async clickAddCartItemButtonFromIndex(index) {
        return await this.wdioFactory.click(await this.wdioFactory.getSelectorByValue(this.locators.inventoryAddCartItemButtonIndex, index));
    }

    async clickAndGetDetailsFromItemIndex(index) {
        const itemNameText = await this.getInventoryNameFromIndexText(index);
        const itemPriceText = await this.getInventoryPriceFromIndexText(index);
        await this.clickAddCartItemButtonFromIndex(index);
        return {
            itemName: itemNameText,
            itemPrice: itemPriceText,
        };
    }

    async getNumberOfItems() {
        return (await this.wdioFactory.getElements(this.locators.inventoryItemCard)).length;
    }

    async addRandomItemsToCart() {
        const detailsPromises = [];
        const numberOfItems = await this.getNumberOfItems();
        const indexesToAdd = await UtilsMethods.getSetFromRange(1, numberOfItems, UtilsMethods.getRandomNumber(1, numberOfItems));

        for await (const index of indexesToAdd) {
            detailsPromises.push(this.clickAndGetDetailsFromItemIndex(index));
        }
        const itemDetails = await Promise.all(detailsPromises);
        return itemDetails;
    }

    async getProperyValuesFromArrayOfDetails(arrOfItemDetail, strPropertyToGet) {
        return await arrOfItemDetail.map(detail => detail[strPropertyToGet]);
    }
}
export default new Inventory();
