import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import cartPage from '../pages/cart.page.js';
import UtilsMethods from '../utils/utilsMethods.utils.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser, openCart } from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };

/**
 * SauceDemo's sort dropdown, which the page labels "filter" although it only
 * reorders the grid.
 *
 * Each test reads the list the page is showing, sorts that same list locally,
 * then asserts the page reaches the same order. The expected order comes from
 * the data on the page rather than a hardcoded list, so adding or renaming a
 * product does not break these tests, but a broken sort on the site still
 * fails them.
 */
describe('product sorting scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should sort products by name, A to Z @KAN-5', async () => {
        await loginAsStandardUser();
        const nameAToZ = UtilsMethods.sortTextAToZ(await inventoryPage.getTextFromNames());
        // The page opens A to Z, so selecting A to Z straight away proves nothing:
        // move to Z to A first, and wait until it shows.
        await inventoryPage.expectTextFromNames(nameAToZ);
        await inventoryPage.header.clickOnSortFilterDropdownOption('za');
        await inventoryPage.expectTextFromNames(UtilsMethods.sortTextZToA(nameAToZ));
        await inventoryPage.header.clickOnSortFilterDropdownOption('az');
        await inventoryPage.expectTextFromNames(nameAToZ);
    });

    it('Should sort products by name, Z to A @KAN-5', async () => {
        await loginAsStandardUser();
        const expectedOrder = UtilsMethods.sortTextZToA(await inventoryPage.getTextFromNames());
        await inventoryPage.header.clickOnSortFilterDropdownOption('za');
        await inventoryPage.expectTextFromNames(expectedOrder);
    });

    it('Should sort products by price, low to high @KAN-5 @KAN-6', async () => {
        await loginAsStandardUser();
        // Every price shows "$", digits, "." and exactly 2 digits (KAN-6 AC-5).
        await inventoryPage.expectEveryPriceToMatch(new RegExp(data.priceFormat));
        const products = await inventoryPage.getProducts();
        // Without two products at the same price the tie-break check below passes vacuously.
        expect(UtilsMethods.findSharedValues(products.map(({ price }) => price))).not.toHaveLength(0);
        const expectedOrder = UtilsMethods.sortByPriceThenName(products, 'lowToHigh');
        await inventoryPage.header.clickOnSortFilterDropdownOption('lohi');
        await inventoryPage.expectTextFromPrices(expectedOrder.map(({ price }) => price));
        await inventoryPage.expectTextFromNames(expectedOrder.map(({ name }) => name));
    });

    it('Should sort products by price, high to low @KAN-5', async () => {
        await loginAsStandardUser();
        const products = await inventoryPage.getProducts();
        // Without two products at the same price the tie-break check below passes vacuously.
        expect(UtilsMethods.findSharedValues(products.map(({ price }) => price))).not.toHaveLength(0);
        const expectedOrder = UtilsMethods.sortByPriceThenName(products, 'highToLow');
        await inventoryPage.header.clickOnSortFilterDropdownOption('hilo');
        await inventoryPage.expectTextFromPrices(expectedOrder.map(({ price }) => price));
        await inventoryPage.expectTextFromNames(expectedOrder.map(({ name }) => name));
    });

    it('Should reset the sort to name, A to Z after leaving the inventory page @KAN-5', async () => {
        await loginAsStandardUser();
        const nameAToZ = UtilsMethods.sortTextAToZ(await inventoryPage.getTextFromNames());
        await inventoryPage.header.clickOnSortFilterDropdownOption('za');
        await inventoryPage.expectTextFromNames(UtilsMethods.sortTextZToA(nameAToZ));
        await openCart();
        await cartPage.header.clickOnBurgerMenuBtn();
        await cartPage.header.sideMenu.clickOnSideMenuOptionByValue('inventory');
        await inventoryPage.header.expectPageTitle('Products');
        await inventoryPage.expectTextFromNames(nameAToZ);
    });
});
