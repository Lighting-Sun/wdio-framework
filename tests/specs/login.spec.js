import loginPage from "../pages/login.page";
import inventoryPage from "../pages/inventory.page";
//this import is used to read files with data, see placeHolderData.js
import { readFileSync } from "fs";


describe('login related scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
    });
    //reading the datafile
    const data = JSON.parse(readFileSync('./tests/data/placeHolderData.json', 'utf-8'));
    it('Should successfuly log in with a valid user', async () => {
        await loginPage.fillUsername(data.users.standard);
        await loginPage.fillPassword(data.password.valid);
        await loginPage.clicklOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
    });

});
