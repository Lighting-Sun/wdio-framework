import loginPage from "../pages/login.page.js";
import inventoryPage from "../pages/inventory.page.js";
import { resetBrowserState } from "../support/session.support.js";
import { loginAsStandardUser } from "../support/flows.support.js";
import data from "../data/placeHolderData.json" with { type: "json" };

describe('login related scenarios', () => {

    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should successfuly log in with a valid user @smoke', async () => {
        await loginPage.fillUsername(data.users.validUser.username);
        await loginPage.fillPassword(data.users.validUser.password);
        await loginPage.clicklOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
    });

    it('Should show an error when logging in with invalid user', async () => {
        await loginPage.fillUsername(data.users.invalidUser.username);
        await loginPage.fillPassword(data.users.invalidUser.password);
        await loginPage.clicklOnLoginBtn();
        await loginPage.expectLoginErrorMessage(data.loginErrorMessage);
    });

    it('Should logout successfully when already logged in @smoke', async () => {
        await loginAsStandardUser();
        await inventoryPage.header.clickOnBurgerMenuBtn();
        await inventoryPage.header.sideMenu.clickOnSideMenuOptionByValue('logout');
        await loginPage.expectLoginLogoText('Swag Labs');
    });
});
