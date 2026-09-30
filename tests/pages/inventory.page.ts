import Header from '../components/header.component.js';
import UtilsMethods, { type ListedProduct } from '../utils/utilsMethods.utils.js';
import * as actions from '../utils/elementActions.utils.js';
import * as expectations from '../utils/elementExpectations.utils.js';
import { getSelectorByValue } from '../utils/locator.utils.js';
import Page from './page.js';

type ItemDetail = { itemName: string; itemPrice: string };

class Inventory extends Page {
    header = new Header();

    locators = {
        inventoryItemName: {
            selector: "div[data-test='inventory-item-name']",
            description: 'inventory item name',
        },
        inventoryItemPrice: {
            selector: "div[data-test='inventory-item-price']",
            description: 'inventory item price',
        },
        inventoryItemNameByName: {
            selector:
                "div[data-test='inventory-item']:has(button[data-test$='-${value}']) div[data-test='inventory-item-name']",
            description: "inventory item name for '${value}'",
        },
        inventoryItemPriceByName: {
            selector:
                "div[data-test='inventory-item']:has(button[data-test$='-${value}']) div[data-test='inventory-item-price']",
            description: "inventory item price for '${value}'",
        },
        inventoryItemDescriptionByName: {
            selector:
                "div[data-test='inventory-item']:has(button[data-test$='-${value}']) div[data-test='inventory-item-desc']",
            description: "inventory item description for '${value}'",
        },
        inventoryAddToCartButtonByName: {
            selector: "button[data-test='add-to-cart-${value}']",
            description: "add to cart button for '${value}'",
        },
        inventoryRemoveButtonByName: {
            selector: "button[data-test='remove-${value}']",
            description: "remove from cart button for '${value}'",
        },
    };

    async getTextFromNames(): Promise<string[]> {
        return await actions.getTextFromElements(this.locators.inventoryItemName);
    }

    /**
     * Retrying comparison for the product name list, for the same reason as
     * the price version below: selecting a sort option re-renders the grid.
     */
    async expectTextFromNames(expectedNames: string[]): Promise<void> {
        await expectations.expectEventuallyEquals('inventory item names', () => this.getTextFromNames(), expectedNames);
    }

    async getTextFromPrices(): Promise<string[]> {
        const textFromPrices = await actions.getTextFromElements(this.locators.inventoryItemPrice);
        return textFromPrices.map((textToTrim) => textToTrim.slice(1));
    }

    /**
     * Retrying comparison for the price list. The sort control triggers a
     * re-render, so a single read can still see the previous order.
     */
    async expectTextFromPrices(expectedPrices: string[]): Promise<void> {
        await expectations.expectEventuallyEquals(
            'inventory item prices',
            () => this.getTextFromPrices(),
            expectedPrices,
        );
    }

    /** Retrying check that every price in the grid, as displayed with its `$`, matches `pattern`. */
    async expectEveryPriceToMatch(pattern: RegExp): Promise<void> {
        await expectations.expectEveryTextToMatch(this.locators.inventoryItemPrice, pattern);
    }

    /** Every product's name and price, in the order the grid shows them. Reads once. */
    async getProducts(): Promise<ListedProduct[]> {
        const names = await this.getTextFromNames();
        const prices = await this.getTextFromPrices();
        return names.map((name, index) => ({ name, price: prices[index] }));
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
        return itemDetails.map((detail) => detail[propertyToGet]);
    }

    async getInventoryItemNameByNameText(value: string): Promise<string> {
        const selector = getSelectorByValue(this.locators.inventoryItemNameByName, UtilsMethods.toProductSlug(value));
        return await actions.getText(selector);
    }

    async getInventoryItemPriceByNameText(value: string): Promise<string> {
        const selector = getSelectorByValue(this.locators.inventoryItemPriceByName, UtilsMethods.toProductSlug(value));
        return await actions.getText(selector);
    }

    async getInventoryItemDescriptionByNameText(value: string): Promise<string> {
        const selector = getSelectorByValue(
            this.locators.inventoryItemDescriptionByName,
            UtilsMethods.toProductSlug(value),
        );
        return await actions.getText(selector);
    }

    async clickInventoryItemAddToCartByName(value: string): Promise<void> {
        const selector = getSelectorByValue(
            this.locators.inventoryAddToCartButtonByName,
            UtilsMethods.toProductSlug(value),
        );
        await actions.click(selector);
    }

    async clickInventoryItemRemoveByName(value: string): Promise<void> {
        const selector = getSelectorByValue(
            this.locators.inventoryRemoveButtonByName,
            UtilsMethods.toProductSlug(value),
        );
        await actions.click(selector);
    }

    /**
     * A product in the cart shows its Remove button in place of Add to cart.
     * Checking both sides stops the test passing on a card that shows both.
     */
    async expectItemInCartByName(value: string, removeLabel: string): Promise<void> {
        const slug = UtilsMethods.toProductSlug(value);
        await expectations.expectText(getSelectorByValue(this.locators.inventoryRemoveButtonByName, slug), removeLabel);
        await expectations.expectNotExisting(getSelectorByValue(this.locators.inventoryAddToCartButtonByName, slug));
    }

    async expectItemNotInCartByName(value: string, addToCartLabel: string): Promise<void> {
        const slug = UtilsMethods.toProductSlug(value);
        await expectations.expectText(
            getSelectorByValue(this.locators.inventoryAddToCartButtonByName, slug),
            addToCartLabel,
        );
        await expectations.expectNotExisting(getSelectorByValue(this.locators.inventoryRemoveButtonByName, slug));
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
