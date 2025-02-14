import loginPage from "../pages/login.page";
import inventoryPage from "../pages/inventory.page";
import cartPage from "../pages/cart.page";
import checkoutPage from "../pages/checkout.page";
import overviewPage from "../pages/overview.page";
import completePage from "../pages/complete.page";
//this import is used to read files with data, see placeHolderData.js
import { readFileSync } from "fs";
import UtilsMethods from "../utils/utilsMethods.utils";


describe('complete purchase scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
    });
    //reading the datafile
    const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));
    it('Should do a successful purchase', async () => {
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
        const result = await inventoryPage.addRandomItemsToCart();
        const inventoryNames = await inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemName');
        const inventoryPrices = await inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemPrice');
        await inventoryPage.header.clickOnShoppingCartBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
        await expect(await cartPage.header.getPageTitleText()).toEqual('Your Cart');
        const cartNames = await cartPage.getItemCartNames();
        const cartPrices = await cartPage.getItemCartPrices();
        await expect(inventoryNames).toEqual(cartNames);
        await expect(inventoryPrices).toEqual(cartPrices);
        await cartPage.clickOnCheckoutButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-one'));
        await expect(await checkoutPage.header.getPageTitleText()).toEqual('Checkout: Your Information');
        await checkoutPage.fillPersonalInformationForm(data.personalInfo.firstName, data.personalInfo.lastName, data.personalInfo.postalCode);
        await checkoutPage.clickContinueButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-step-two'));
        await expect(await overviewPage.header.getPageTitleText()).toEqual('Checkout: Overview');
        const overviewNames = await overviewPage.getItemOverviewNames();
        const overviewPrices = await overviewPage.getTextFromPrices();
        await expect(overviewNames).toEqual(cartNames);
        await expect(overviewPrices).toEqual(cartPrices);
        const overviewSumPrices = await UtilsMethods.sumArrAndFixPresicion(await overviewPage.getValuesFromPrices(), 2);
        const overviewSubTotalPrice = await UtilsMethods.fixNumberPresicion(await overviewPage.getSubTotalValue(), 2);
        await expect(overviewSumPrices).toEqual(overviewSubTotalPrice);
        await overviewPage.clickOnFinishButton();
        await expect(browser).toHaveUrl(expect.stringContaining('/checkout-complete'));
        await expect(await completePage.header.getPageTitleText()).toEqual('Checkout: Complete!');
        await expect(await completePage.getCompletePurchaseText()).toEqual('Thank you for your order!');
    });


});
