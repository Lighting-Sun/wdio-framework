import loginPage from "../pages/login.page";
import inventoryPage from "../pages/inventory.page";
import UtilsMethods from "../utils/utilsMethods.utils";

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
        console.log(await inventoryPage.addRandomItemsToCart());
    });

});
