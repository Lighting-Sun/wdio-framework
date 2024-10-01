import BaseComponent from "./base.component";

class SideMenu extends BaseComponent {

    locators = {
        sideMenuOption:
        {
            selector: "//a[@class='bm-item menu-item'][text()='${value}']",
            description: "side menu option '${value}'"
        }
    };

    async getSideMenuOptionByValue(strValue) {
        return await this.wdioFactoryUtils.getSelectorByValue(this.locators.sideMenuOption, strValue);
    }

    async clickOnSideMenuOptionByValue(strValue) {
        await this.wdioFactoryUtils.click(await this.getSideMenuOptionByValue(strValue));
    }

}

export default SideMenu;
