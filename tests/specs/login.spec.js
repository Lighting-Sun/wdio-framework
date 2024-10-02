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
        await loginPage.fillUsername(data.users.validUser.username);
        await loginPage.fillPassword(data.users.validUser.password);
        await loginPage.clicklOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
    });

    it('Should show an error when logging in with invalid user', async () => {
        await loginPage.fillUsername(data.users.invalidUser.username);
        await loginPage.fillPassword(data.users.invalidUser.password);
        await loginPage.clicklOnLoginBtn();
        await expect(await loginPage.getLoginErrorMessage()).toEqual(data.loginErrorMessage);
    });

    it('Should logout successfully when already logged in', async () => {
        await loginPage.fillUsername(data.users.validUser.username);
        await loginPage.fillPassword(data.users.validUser.password);
        await loginPage.clicklOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await expect(await inventoryPage.header.getPageTitleText()).toEqual('Products');
        await inventoryPage.header.clickOnBurgerMenuBtn();
        await inventoryPage.header.sideMenu.clickOnSideMenuOptionByValue('Logout');
        await expect(await loginPage.getLoginLogoText()).toEqual('Swag Labs');
    });
});
