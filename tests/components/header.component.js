import BaseComponent from "./base.component";
import SideMenu from "./sidemenu.component";
class Header extends BaseComponent {

    sideMenu = new SideMenu();

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
            selector: "select.product_sort_container",
            description: "sort filter dropdown",
        },
        selectDropdownOption: {
            selector: "select option[value='${value}']",
            description: "'${value}' select option",
        }
    };

    async getPageTitleText() {
        return await this.wdioFactoryUtils.getText(this.locators.pageTitle);
    }

    async clickOnBurgerMenuBtn() {
        await this.wdioFactoryUtils.click(this.locators.burgerMenuBtn);
    }

    async clickOnSortFilterDropdownOption(strValue) {
        await this.wdioFactoryUtils.click(this.locators.sortFilterDropdown);
        await this.wdioFactoryUtils.selectOptionFromSelect(this.locators.sortFilterDropdown, 'value', strValue);
    }
}

export default Header;
