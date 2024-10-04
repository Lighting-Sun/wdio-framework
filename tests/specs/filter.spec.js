import loginPage from "../pages/login.page";
import inventoryPage from "../pages/inventory.page";
import UtilsMethods from "../utils/utilsMethods.utils";

//this import is used to read files with data, see placeHolderData.js
import { readFileSync } from "fs";


describe('login related scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
    });
    //reading the datafile
    const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));
    it('Should successfuly sort products', async () => {
        //TODO the test case is completed, reporting logs are missing
        await loginPage.loginWithCredentials(data.users.validUser.username, data.users.validUser.password);
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
        const beforeSortingPrices = UtilsMethods.sortLowToHighValues((await inventoryPage.getTextFromPrices()));
        await inventoryPage.header.clickOnSortFilterDropdownOption('lohi');
        const afterSortingPrices = await inventoryPage.getTextFromPrices();
        await expect(beforeSortingPrices).toEqual(afterSortingPrices);
    });

});
