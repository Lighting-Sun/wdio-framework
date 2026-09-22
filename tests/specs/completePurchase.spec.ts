import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import cartPage from "../pages/cart.page.js";
import checkoutPage from "../pages/checkout.page.js";
import overviewPage from "../pages/overview.page.js";
import completePage from "../pages/complete.page.js";
import { resetBrowserState } from "../support/session.support.js";
import { loginAsStandardUser, openCart } from "../support/flows.support.js";
import data from "../data/placeHolderData.json" with { type: "json" };
import UtilsMethods from "../utils/utilsMethods.utils.js";

describe('complete purchase scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should do a successful purchase', async () => {
        await loginAsStandardUser();
        const result = await inventoryPage.addItemsToCartByNames(data.cartProducts);
        const inventoryNames = inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemName');
        const inventoryPrices = inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemPrice');
        await openCart();
        await cartPage.expectItemCartNames(inventoryNames);
        await cartPage.expectItemCartPrices(inventoryPrices);
        await cartPage.clickOnCheckoutButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-one'));
        await checkoutPage.header.expectPageTitle('Checkout: Your Information');
        await checkoutPage.fillPersonalInformationForm(data.personalInfo.firstName, data.personalInfo.lastName, data.personalInfo.postalCode);
        await checkoutPage.clickContinueButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-two'));
        await overviewPage.header.expectPageTitle('Checkout: Overview');
        await overviewPage.expectItemOverviewNames(inventoryNames);
        await overviewPage.expectItemOverviewPrices(inventoryPrices);
        const overviewSumPrices = UtilsMethods.sumArrAndFixPresicion(await overviewPage.getValuesFromPrices(), 2);
        const overviewSubTotalPrice = UtilsMethods.fixNumberPresicion(await overviewPage.getSubTotalValue(), 2);
        expect(overviewSumPrices).toEqual(overviewSubTotalPrice);
        await overviewPage.clickOnFinishButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-complete'));
        await completePage.header.expectPageTitle('Checkout: Complete!');
        await completePage.expectCompletePurchaseText('Thank you for your order!');
    });
});
