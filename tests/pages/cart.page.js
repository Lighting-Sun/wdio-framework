import Page from './page.js';


const locators = {
    itemNameDinamic: {
        selector: "//div[text()='Sauce Labs Onesie']",
        description: "dinamic iten name locator",
    },
    itemPriceFromItemName: {
        selector: "//div[text()='Sauce Labs Onesie']/ancestor-or-self::div[@class='cart_item_label']//div[@data-test='inventory-item-price']",
        description: "dynamic price selector",
    }
};

