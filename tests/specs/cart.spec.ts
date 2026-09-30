import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser, openCart } from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

/** The cart products left after removing the single product from the full list. */
const cartProductsWithoutSingle = data.cartProducts.filter((name) => name !== data.singleCartProduct);

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
        await inventoryPage.header.expectCartBadgeCount(data.cartProducts.length);
        await openCart();
        await cartPage.expectItemCartNames(inventoryNames);
        await cartPage.expectItemCartPrices(inventoryPrices);
    });

    it('Should add and validate a single specific item to cart @smoke', async () => {
        await loginAsStandardUser();
        const result = await inventoryPage.addItemToCartByName(data.singleCartProduct);
        await inventoryPage.expectItemInCartByName(data.singleCartProduct, data.cartButtonLabels.remove);
        await inventoryPage.header.expectCartBadgeCount(1);
        await openCart();
        await cartPage.expectItemCartNames([result.itemName]);
        await cartPage.expectItemCartPrices([result.itemPrice]);
    });

    it('Should remove every item from the cart', async () => {
        await loginAsStandardUser();
        await inventoryPage.addItemsToCartByNames(data.cartProducts);
        await openCart();
        await cartPage.removeItemFromCartByName(data.singleCartProduct);
        await cartPage.expectItemCartNames(cartProductsWithoutSingle);
        await cartPage.header.expectCartBadgeCount(cartProductsWithoutSingle.length);
        await cartPage.removeAllItemsFromCart();
        await cartPage.expectItemCartNames([]);
        await cartPage.header.expectNoCartBadge();
    });

    it('Should remove a product from the cart on the inventory page', async () => {
        await loginAsStandardUser();
        await inventoryPage.addItemsToCartByNames(data.cartProducts);
        await inventoryPage.clickInventoryItemRemoveByName(data.singleCartProduct);
        await inventoryPage.expectItemNotInCartByName(data.singleCartProduct, data.cartButtonLabels.addToCart);
        await inventoryPage.header.expectCartBadgeCount(cartProductsWithoutSingle.length);
        await openCart();
        await cartPage.expectItemCartNames(cartProductsWithoutSingle);
    });
});
