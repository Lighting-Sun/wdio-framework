import loginPage from "../pages/login.page";
import inventoryPage from "../pages/inventory.page";
import cartPage from "../pages/cart.page";

//this import is used to read files with data, see placeHolderData.js
import { readFileSync } from "fs";


describe('product pruchase scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
    });
    //reading the datafile
    const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));
    it('Should add and validate multiple items added to cart', async () => {
        //TODO the test case is completed, reporting logs are missing
        await loginPage.fillUsername(data.users.validUser.username);
        await loginPage.fillPassword(data.users.validUser.password);
        await loginPage.clicklOnLoginBtn();
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
        //TODO might need to add extra logs for reporting.
        await expect(inventoryNames).toEqual(cartNames);
        await expect(inventoryPrices).toEqual(cartPrices);
        await cartPage.removeAllItemsFromCart();
    });

    it('Should add and validate a single specific item to cart', async () => {
        //TODO the test case is completed, reporting logs are missing
        await loginPage.fillUsername(data.users.validUser.username);
        await loginPage.fillPassword(data.users.validUser.password);
        await loginPage.clicklOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
        const result = await inventoryPage.AddItemToCartByName('Sauce Labs Onesie');
        const inventoryNames = result.itemName;
        const inventoryPrices = result.itemPrice;
        await inventoryPage.header.clickOnShoppingCartBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
        await expect(await cartPage.header.getPageTitleText()).toEqual('Your Cart');
        const cartNames = await cartPage.getItemCartNames();
        const cartPrices = await cartPage.getItemCartPrices();
        //TODO might need to add extra logs for reporting.
        await expect([inventoryNames]).toEqual(cartNames);
        await expect([inventoryPrices]).toEqual(cartPrices);
        await cartPage.removeAllItemsFromCart();
    });

});
