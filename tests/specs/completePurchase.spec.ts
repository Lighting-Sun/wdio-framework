import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import checkoutPage from '../pages/checkout.page.js';
import overviewPage from '../pages/overview.page.js';
import completePage from '../pages/complete.page.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser, openCart } from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

/**
 * The purchase journey: checks each screen transition and that the chosen
 * products carry through to the overview. Prices, totals and descriptions are
 * checked by overview.spec.ts, not here.
 */
describe('complete purchase scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should complete a purchase from cart to order confirmation @KAN-6 @journey @smoke', async () => {
        await loginAsStandardUser();
        const result = await inventoryPage.addItemsToCartByNames(data.cartProducts);
        const inventoryNames = inventoryPage.getPropertyValuesFromArrayOfDetails(result, 'itemName');
        await openCart();
        await cartPage.clickOnCheckoutButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-one'));
        await checkoutPage.header.expectPageTitle('Checkout: Your Information');
        await checkoutPage.fillPersonalInformationForm(
            data.personalInfo.firstName,
            data.personalInfo.lastName,
            data.personalInfo.postalCode,
        );
        await checkoutPage.clickContinueButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-two'));
        await overviewPage.header.expectPageTitle('Checkout: Overview');
        await overviewPage.expectItemOverviewNames(inventoryNames);
        await overviewPage.clickOnFinishButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-complete'));
        await completePage.header.expectPageTitle('Checkout: Complete!');
        await completePage.expectCompletePurchaseText(data.orderConfirmation);
    });
});
