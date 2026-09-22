import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import UtilsMethods from "../utils/utilsMethods.utils.js";
import { resetBrowserState } from "../support/session.support.js";
import { loginAsStandardUser } from "../support/flows.support.js";

describe('product sorting scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should successfully sort products', async () => {
        //TODO the test case is completed, reporting logs are missing
        await loginAsStandardUser();
        const beforeSortingPrices = UtilsMethods.sortLowToHighValues(await inventoryPage.getTextFromPrices());
        await inventoryPage.header.clickOnSortFilterDropdownOption('lohi');
        await inventoryPage.expectTextFromPrices(beforeSortingPrices);
    });
});
