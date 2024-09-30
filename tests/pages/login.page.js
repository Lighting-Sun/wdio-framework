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
            selector: "button[data-test='error-button']",
            description: "login error message",
        },
    };

    async openPage() {
        await this.open('https://www.saucedemo.com/');
    }

    async fillUsername(username) {
        await this.wdioFactory.setValue(this.locators.usernameInput, username);
    }
    async fillPassword(password) {
        await this.wdioFactory.setValue(this.locators.passwordInput, password);
    }
    async clicklOnLoginBtn() {
        await this.wdioFactory.click(this.locators.loginButton);
    }
}

export default new LoginPage();
