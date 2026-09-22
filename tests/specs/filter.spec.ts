import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import UtilsMethods from "../utils/utilsMethods.utils.js";
import { resetBrowserState } from "../support/session.support.js";
import data from "../data/placeHolderData.json" with { type: "json" };

describe('login related scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should successfuly sort products', async () => {
        //TODO the test case is completed, reporting logs are missing
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
        const beforeSortingPrices = UtilsMethods.sortLowToHighValues(await inventoryPage.getTextFromPrices());
        await inventoryPage.header.clickOnSortFilterDropdownOption('lohi');
        const afterSortingPrices = await inventoryPage.getTextFromPrices();
        expect(beforeSortingPrices).toEqual(afterSortingPrices);
    });
});
