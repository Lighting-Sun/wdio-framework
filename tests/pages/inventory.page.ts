import Header from '../components/header.component.js';
import UtilsMethods from '../utils/utilsMethods.utils.js';
import Page from './page.js';

type ItemDetail = { itemName: string; itemPrice: string };

class Inventory extends Page {
    header = new Header();

    locators = {
        inventoryItemPrice: {
            selector: "div[data-test='inventory-item-price']",
            description: "inventory item price",
        },
        inventoryItemNameByName: {
            selector: "div[data-test='inventory-item']:has(button[data-test$='-${value}']) div[data-test='inventory-item-name']",
            description: "inventory item name for '${value}'",
        },
        inventoryItemPriceByName: {
            selector: "div[data-test='inventory-item']:has(button[data-test$='-${value}']) div[data-test='inventory-item-price']",
            description: "inventory item price for '${value}'",
        },
        inventoryAddToCartButtonByName: {
            selector: "button[data-test='add-to-cart-${value}']",
            description: "add to cart button for '${value}'",
        }
    };

    async getTextFromPrices(): Promise<string[]> {
        const textFromPrices = await this.wdioFactory.getTextFromElements(this.locators.inventoryItemPrice);
        return textFromPrices.map(textToTrim => textToTrim.slice(1));
    }

    /**
     * Retrying comparison for the price list. The sort control triggers a
     * re-render, so a single read can still see the previous order.
     */
    async expectTextFromPrices(expectedPrices: string[]): Promise<void> {
        await this.wdioFactory.expectEventuallyEquals(
            'inventory item prices',
            () => this.getTextFromPrices(),
            expectedPrices
        );
    }

    /**
     * Adds a fixed, caller-supplied list of products. Replaces the previous
     * random selection: a failure here names the exact products involved and
     * re-runs identically.
     */
    async addItemsToCartByNames(itemNames: string[]): Promise<ItemDetail[]> {
        const itemDetails: ItemDetail[] = [];
        for (const itemName of itemNames) {
            itemDetails.push(await this.addItemToCartByName(itemName));
        }
        return itemDetails;
    }

    getPropertyValuesFromArrayOfDetails(itemDetails: ItemDetail[], propertyToGet: keyof ItemDetail): string[] {
        return itemDetails.map(detail => detail[propertyToGet]);
    }

    async getInventoryItemNameByNameText(value: string): Promise<string> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemNameByName, UtilsMethods.toProductSlug(value));
        return await this.wdioFactory.getText(selector);
    }

    async getInventoryItemPriceByNameText(value: string): Promise<string> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryItemPriceByName, UtilsMethods.toProductSlug(value));
        return await this.wdioFactory.getText(selector);
    }

    async clickInventoryItemAddToCartByName(value: string): Promise<void> {
        const selector = await this.wdioFactory.getSelectorByValue(this.locators.inventoryAddToCartButtonByName, UtilsMethods.toProductSlug(value));
        await this.wdioFactory.click(selector);
    }

    async addItemToCartByName(value: string): Promise<ItemDetail> {
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
