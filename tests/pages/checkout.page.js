import Page from './page.js';

class CheckoutPage extends Page {

    locators = {
        firstNameInput: {
            selector: "#first-name",
            description: "first name input",
        },
        lastNameInput: {
            selector: "#last-name",
            description: "last name input",
        },
        postalCodeInput: {
            selector: "#postal-code",
            description: "postal code input",
        },
        continueButton: {
            selector: "#continue",
            description: "continue button",
        }

    };

}
export default new CheckoutPage();
