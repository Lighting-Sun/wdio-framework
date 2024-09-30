import BaseComponent from "./base.component";

class Header extends BaseComponent {
    locators = {
        burgerMenuBtn: {
            selector: ".bm-burger-button",
            description: "burger menu button that opens a sidebar menu",
        },
        shoppingCartBtn: {
            selector: "#shopping_cart_container",
            description: "username input field",
        },
        pageTitle: {
            selector: "span.title",
            description: "title located in the header, indicating in which page we are on",
        },
        sortFilterDropdown: {
            selector: "span.select_container",
            description: "sort filter dropdown",
        },
        lowToHighSelectOption: {
            selector: "option[value='lohi']",
            description: "lohi select option",
        }
    };

    getPageTitleText() {
        return this.wdioFactoryUtils.getText(this.locators.pageTitle);
    }
}

export default Header;
