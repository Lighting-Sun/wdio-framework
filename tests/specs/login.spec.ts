import loginPage from '../pages/login.page.js';
import inventoryPage from '../pages/inventory.page.js';
import { resetBrowserState } from '../support/session.support.js';
import { loginAsStandardUser } from '../support/flows.support.js';
import data from '../data/placeHolderData.json' with { type: 'json' };
import { validUser, lockedOutUser } from '../support/credentials.support.js';

describe('login related scenarios', () => {
    beforeEach(async () => {
        await loginPage.openPage();
        await resetBrowserState();
    });

    it('Should successfully log in with a valid user @smoke', async () => {
        await loginPage.fillUsername(validUser.username);
        await loginPage.fillPassword(validUser.password);
        await loginPage.clickOnLoginBtn();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory'));
        await inventoryPage.header.expectPageTitle('Products');
    });

    it('Should show an error when logging in with a locked out user', async () => {
        await loginPage.fillUsername(lockedOutUser.username);
        await loginPage.fillPassword(lockedOutUser.password);
        await loginPage.clickOnLoginBtn();
        await loginPage.expectLoginErrorMessage(data.loginErrorMessage);
    });

    it('Should logout successfully when already logged in @smoke', async () => {
        await loginAsStandardUser();
        await inventoryPage.header.clickOnBurgerMenuBtn();
        await inventoryPage.header.sideMenu.clickOnSideMenuOptionByValue('logout');
        await loginPage.expectLoginLogoText('Swag Labs');
    });
});
