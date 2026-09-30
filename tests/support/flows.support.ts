import { browser, expect } from '@wdio/globals';
import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import checkoutPage from '../pages/checkout.page.js';
import overviewPage from '../pages/overview.page.js';
import { validUser } from './credentials.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

/** A product as the inventory page showed it before it went into the cart. */
export interface InventoryProduct {
    name: string;
    price: string;
    description: string;
}

/**
 * Reusable preconditions, as opposed to page objects: a page object models a
 * PAGE, a flow models a STATE the test needs to start from.
 *
 * Only use these for steps that are setup for the scenario under test. A test
 * whose subject IS logging in should still drive the login page directly —
 * otherwise the thing being verified is hidden inside a helper.
 */

/** Logs in as the standard user and confirms the inventory page is showing. */
export async function loginAsStandardUser(): Promise<void> {
    await loginPage.loginWithCredentials(validUser.username, validUser.password);
    await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
    await inventoryPage.header.expectPageTitle('Products');
}

/** Opens the cart from the header and confirms the cart page is showing. */
export async function openCart(): Promise<void> {
    await inventoryPage.header.clickOnShoppingCartBtn();
    await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
    await cartPage.header.expectPageTitle('Your Cart');
}

/**
 * From the inventory page: adds the products, then goes cart → Checkout → fills
 * the checkout form → Continue, and confirms the overview page is showing.
 * Returns each product's name, price and description as the inventory showed
 * them, for the overview to be compared against.
 */
export async function reachOverview(productNames: string[]): Promise<InventoryProduct[]> {
    const products: InventoryProduct[] = [];
    for (const productName of productNames) {
        const description = await inventoryPage.getInventoryItemDescriptionByNameText(productName);
        const { itemName, itemPrice } = await inventoryPage.addItemToCartByName(productName);
        products.push({ name: itemName, price: itemPrice, description });
    }
    await openCart();
    await cartPage.clickOnCheckoutButton();
    await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-one'));
    await checkoutPage.fillPersonalInformationForm(
        data.personalInfo.firstName,
        data.personalInfo.lastName,
        data.personalInfo.postalCode,
    );
    await checkoutPage.clickContinueButton();
    await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-two'));
    await overviewPage.header.expectPageTitle('Checkout: Overview');
    return products;
}
