import { $ } from '@wdio/globals';
import Page from './page.js';


const locators = {
    loginButton: {
        selector: "#login-button",
        description: "loggin button for the saucedemo application",
    },
    usernameInput: {
        selector: "//input[@data-test='username']",
        description: "username input field",
    },
    passwordInput: {
        selector: "//input[@data-test='password']",
        description: "password input field",
    },
    loginErrorMessage: {
        selector: "//button[@data-test='error-button']",
        description: "login error message",
    },
};