import { browser, expect } from '@wdio/globals';
import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

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
    await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
    await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
    await inventoryPage.header.expectPageTitle('Products');
}

/** Opens the cart from the header and confirms the cart page is showing. */
export async function openCart(): Promise<void> {
    await inventoryPage.header.clickOnShoppingCartBtn();
    await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
    await cartPage.header.expectPageTitle('Your Cart');
}
