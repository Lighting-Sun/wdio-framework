import Page from './page.js';

class LoginPage extends Page {

    locators = {
        loginButton: {
            selector: "#login-button",
            description: "login button for the saucedemo application",
        },
        usernameInput: {
            selector: "input[data-test='username']",
            description: "username input field",
        },
        passwordInput: {
            selector: "input[data-test='password']",
            description: "password input field",
        },
        loginErrorMessage: {
            selector: "h3[data-test='error']",
            description: "login error message",
        },
        loginLogo: {
            selector: "div.login_logo",
            description: "Swag Labs logo in login page",
        },
    };

    async openPage(): Promise<void> {
        await this.open(browser.options.baseUrl as string);
    }

    async fillUsername(username: string): Promise<void> {
        await this.wdioFactory.setValue(this.locators.usernameInput, username);
    }

    async fillPassword(password: string): Promise<void> {
        await this.wdioFactory.setValue(this.locators.passwordInput, password);
    }

    async clicklOnLoginBtn(): Promise<void> {
        await this.wdioFactory.click(this.locators.loginButton);
    }

    async getLoginErrorMessage(): Promise<string> {
        return await this.wdioFactory.getText(this.locators.loginErrorMessage);
    }

    async getLoginLogoText(): Promise<string> {
        return await this.wdioFactory.getText(this.locators.loginLogo);
    }

    async loginWithCredentials(srtUserName: string, strPassword: string): Promise<void> {
        await this.fillUsername(srtUserName);
        await this.fillPassword(strPassword);
        await this.clicklOnLoginBtn();
    }
}

export default new LoginPage();
