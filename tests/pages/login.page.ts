import * as actions from '../utils/elementActions.utils.js';
import * as expectations from '../utils/elementExpectations.utils.js';
import Page from './page.js';

class LoginPage extends Page {
    locators = {
        loginButton: {
            selector: '#login-button',
            description: 'login button for the saucedemo application',
        },
        usernameInput: {
            selector: "input[data-test='username']",
            description: 'username input field',
        },
        passwordInput: {
            selector: "input[data-test='password']",
            description: 'password input field',
        },
        loginErrorMessage: {
            selector: "h3[data-test='error']",
            description: 'login error message',
        },
        loginLogo: {
            selector: 'div.login_logo',
            description: 'Swag Labs logo in login page',
        },
    };

    async openPage(): Promise<void> {
        await this.open(browser.options.baseUrl as string);
    }

    async fillUsername(username: string): Promise<void> {
        await actions.setValue(this.locators.usernameInput, username);
    }

    async fillPassword(password: string): Promise<void> {
        await actions.setValue(this.locators.passwordInput, password);
    }

    async clickOnLoginBtn(): Promise<void> {
        await actions.click(this.locators.loginButton);
    }

    async getLoginErrorMessage(): Promise<string> {
        return await actions.getText(this.locators.loginErrorMessage);
    }

    async getLoginLogoText(): Promise<string> {
        return await actions.getText(this.locators.loginLogo);
    }

    async expectLoginErrorMessage(expectedMessage: string): Promise<void> {
        await expectations.expectText(this.locators.loginErrorMessage, expectedMessage);
    }

    async expectLoginLogoText(expectedText: string): Promise<void> {
        await expectations.expectText(this.locators.loginLogo, expectedText);
    }

    async loginWithCredentials(username: string, password: string): Promise<void> {
        await this.fillUsername(username);
        await this.fillPassword(password);
        await this.clickOnLoginBtn();
    }
}

export default new LoginPage();
