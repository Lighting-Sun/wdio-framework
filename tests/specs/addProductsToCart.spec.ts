import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import cartPage from "../pages/cart.page.js";
import { resetBrowserState } from "../support/session.support.js";
import { readFileSync } from "fs";

describe('product purchase scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));

    it('Should add and validate multiple items added to cart', async () => {
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
        const result = await inventoryPage.addItemsToCartByNames(data.cartProducts);
        const inventoryNames = await inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemName');
        const inventoryPrices = await inventoryPage.getProperyValuesFromArrayOfDetails(result, 'itemPrice');
        await inventoryPage.header.clickOnShoppingCartBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
        await cartPage.header.expectPageTitle('Your Cart');
        await cartPage.expectItemCartNames(inventoryNames);
        await cartPage.expectItemCartPrices(inventoryPrices);
    });

    it('Should add and validate a single specific item to cart @smoke', async () => {
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
        const result = await inventoryPage.AddItemToCartByName(data.singleCartProduct);
        await inventoryPage.header.clickOnShoppingCartBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/cart'));
        await cartPage.header.expectPageTitle('Your Cart');
        await cartPage.expectItemCartNames([result.itemName]);
        await cartPage.expectItemCartPrices([result.itemPrice]);
    });

    it('Should remove every item from the cart', async () => {
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.addItemsToCartByNames(data.cartProducts);
        await inventoryPage.header.clickOnShoppingCartBtn();
        await cartPage.header.expectPageTitle('Your Cart');
        await cartPage.removeAllItemsFromCart();
        await cartPage.expectItemCartNames([]);
    });
});
