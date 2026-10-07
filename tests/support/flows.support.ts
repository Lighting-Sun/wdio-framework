import { browser, expect } from '@wdio/globals';
import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import checkoutPage from '../pages/checkout.page.js';
import overviewPage from '../pages/overview.page.js';
import { step } from '../utils/report.utils.js';
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
    await step('🧭 Log in as the standard user and land on Products', async () => {
        await loginPage.loginWithCredentials(validUser.username, validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
    });
}

/** Opens the cart from the header and confirms the cart page is showing. */
export async function openCart(): Promise<void> {
    await step('🧭 Open the cart', async () => {
        await inventoryPage.header.clickOnShoppingCartBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
        await cartPage.header.expectPageTitle('Your Cart');
    });
}

/** Confirms the checkout information page is showing (URL and title). */
export async function expectOnCheckoutInformation(): Promise<void> {
    await step('🔎 Expect to be on Checkout: Your Information', async () => {
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-one'));
        await checkoutPage.header.expectPageTitle('Checkout: Your Information');
    });
}

/** Confirms the checkout overview page is showing (URL and title). */
export async function expectOnOverview(): Promise<void> {
    await step('🔎 Expect to be on Checkout: Overview', async () => {
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-two'));
        await overviewPage.header.expectPageTitle('Checkout: Overview');
    });
}

/** From the cart: selects Checkout and confirms the checkout information page is showing. */
export async function openCheckoutInformation(): Promise<void> {
    await step('🧭 Go from the cart to checkout information', async () => {
        await cartPage.clickOnCheckoutButton();
        await expectOnCheckoutInformation();
    });
}

/**
 * From the inventory page: adds the products, then goes cart → Checkout → fills
 * the checkout form → Continue, and confirms the overview page is showing.
 * Returns each product's name, price and description as the inventory showed
 * them, for the overview to be compared against.
 */
export async function reachOverview(productNames: string[]): Promise<InventoryProduct[]> {
    return await step(`🧭 Reach the checkout overview with ${productNames.length} product(s)`, async () => {
        const products: InventoryProduct[] = [];
        for (const productName of productNames) {
            const description = await inventoryPage.getInventoryItemDescriptionByNameText(productName);
            const { itemName, itemPrice } = await inventoryPage.addItemToCartByName(productName);
            products.push({ name: itemName, price: itemPrice, description });
        }
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.fillPersonalInformationForm(
            data.personalInfo.firstName,
            data.personalInfo.lastName,
            data.personalInfo.postalCode,
        );
        await checkoutPage.clickContinueButton();
        await expectOnOverview();
        return products;
    });
}
