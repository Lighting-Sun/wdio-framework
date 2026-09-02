import BaseComponent from "./base.component.js";
import SideMenu from "./sidemenu.component.js";

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

    async getPageTitleText(): Promise<string> {
        return await this.wdioFactoryUtils.getText(this.locators.pageTitle);
    }

    async clickOnBurgerMenuBtn(): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.burgerMenuBtn);
    }

    async clickOnSortFilterDropdownOption(strValue: string): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.sortFilterDropdown);
        await this.wdioFactoryUtils.selectOptionFromSelect(this.locators.sortFilterDropdown, 'value', strValue);
    }

    async clickOnShoppingCartBtn(): Promise<void> {
        await this.wdioFactoryUtils.click(this.locators.shoppingCartBtn);
    }
}

export default Header;
