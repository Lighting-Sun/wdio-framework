import { $ } from '@wdio/globals';
import Page from './page.js';


const locators = {
    selectContainer: {
        selector: "//span[@class='select_container']",
        description: "select container option",
    },
    lowToHighSelectOption: {
        selector: "//option[@value='lohi']",
        description: "lohi select option",
    },
    inventoryItemLabelFromName: {
        selector: "//div[text()='Sauce Labs Onesie']",
        description: "select item from name",
    },
    inventoryItemPrice: {
        selector: "//div[@class='inventory_item_price']",
        description: "inventory item price",
    },
    addToCartButtonBasedOnItemName: {
        selector: "//div[text()='Sauce Labs Onesie']/ancestor-or-self::div[@class='inventory_item_description']//button[text()='Add to cart']",
        description: "add to cart button based on item name",
    }
};

