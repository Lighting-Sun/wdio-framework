import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import cartPage from "../pages/cart.page.js";
import { resetBrowserState } from "../support/session.support.js";
import { loginAsStandardUser, openCart } from "../support/flows.support.js";
import data from "../data/placeHolderData.json" with { type: "json" };

describe('product purchase scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should add and validate multiple items added to cart', async () => {
        await loginAsStandardUser();
        const result = await inventoryPage.addItemsToCartByNames(data.cartProducts);
        const inventoryNames = inventoryPage.getPropertyValuesFromArrayOfDetails(result, 'itemName');
        const inventoryPrices = inventoryPage.getPropertyValuesFromArrayOfDetails(result, 'itemPrice');
        await openCart();
        await cartPage.expectItemCartNames(inventoryNames);
        await cartPage.expectItemCartPrices(inventoryPrices);
    });

    it('Should add and validate a single specific item to cart @smoke', async () => {
        await loginAsStandardUser();
        const result = await inventoryPage.addItemToCartByName(data.singleCartProduct);
        await openCart();
        await cartPage.expectItemCartNames([result.itemName]);
        await cartPage.expectItemCartPrices([result.itemPrice]);
    });

    it('Should remove every item from the cart', async () => {
        await loginAsStandardUser();
        await inventoryPage.addItemsToCartByNames(data.cartProducts);
        await openCart();
        await cartPage.removeAllItemsFromCart();
        await cartPage.expectItemCartNames([]);
    });
});
