import loginPage from '../pages/login.page.js';
import cartPage from '../pages/cart.page.js';
import checkoutPage from '../pages/checkout.page.js';
import { resetBrowserState } from '../support/session.support.js';
import {
    expectOnCheckoutInformation,
    expectOnOverview,
    loginAsStandardUser,
    openCart,
    openCheckoutInformation,
} from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

/**
 * The checkout information form. Every test starts from an empty cart, which
 * the app allows (see the last test). Errors name only the first empty field
 * in form order, so each missing-field test fills the other two.
 */
describe('checkout information scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should show the three checkout fields with their placeholders', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.expectPlaceholders([
            data.checkoutPlaceholders.firstName,
            data.checkoutPlaceholders.lastName,
            data.checkoutPlaceholders.postalCode,
        ]);
    });

    it('Should block Continue and name First Name when it is empty', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.fillLastName(data.personalInfo.lastName);
        await checkoutPage.fillPostalCode(data.personalInfo.postalCode);
        await checkoutPage.clickContinueButton();
        await checkoutPage.expectErrorMessage(data.checkoutErrors.firstName);
        await expectOnCheckoutInformation();
    });

    it('Should block Continue and name Last Name when it is empty', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.fillFirstName(data.personalInfo.firstName);
        await checkoutPage.fillPostalCode(data.personalInfo.postalCode);
        await checkoutPage.clickContinueButton();
        await checkoutPage.expectErrorMessage(data.checkoutErrors.lastName);
        await expectOnCheckoutInformation();
    });

    it('Should block Continue and name Postal Code when it is empty', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.fillFirstName(data.personalInfo.firstName);
        await checkoutPage.fillLastName(data.personalInfo.lastName);
        await checkoutPage.clickContinueButton();
        await checkoutPage.expectErrorMessage(data.checkoutErrors.postalCode);
        await expectOnCheckoutInformation();
    });

    it('Should name only the first empty field when several are empty', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.clickContinueButton();
        await checkoutPage.expectErrorMessage(data.checkoutErrors.firstName);
        // Postal code stays empty too, so the next error must name Last Name, not it.
        await checkoutPage.fillFirstName(data.personalInfo.firstName);
        await checkoutPage.clickContinueButton();
        await checkoutPage.expectErrorMessage(data.checkoutErrors.lastName);
        await expectOnCheckoutInformation();
    });

    it('Should accept fields holding only spaces as filled', async () => {
        await loginAsStandardUser();
        await openCart();
        await openCheckoutInformation();
        await checkoutPage.fillPersonalInformationForm(
            data.whitespaceInfo.firstName,
            data.whitespaceInfo.lastName,
            data.whitespaceInfo.postalCode,
        );
        await checkoutPage.clickContinueButton();
        await expectOnOverview();
    });

    it('Should reach checkout information with an empty cart', async () => {
        await loginAsStandardUser();
        await openCart();
        // Without this guard the test would pass on a cart that had items in it.
        await cartPage.expectItemCartNames([]);
        await cartPage.header.expectNoCartBadge();
        await cartPage.clickOnCheckoutButton();
        await expectOnCheckoutInformation();
    });
});
