class UtilsMethods {

    static sortLowToHighValues(arrValues: string[]): string[] {
        return arrValues.sort((a, b) => Number(a) - Number(b));
    }

    /**
     * Converts a product name into the slug SauceDemo uses in its `data-test`
     * attributes: "Sauce Labs Bike Light" -> "sauce-labs-bike-light".
     *
     * This is what lets locators target a specific product without matching on
     * its visible text, which breaks on whitespace and copy changes.
     */
    static toProductSlug(strProductName: string): string {
        return strProductName.trim().toLowerCase().replace(/\s+/g, '-');
    }

    static async sumArrAndFixPresicion(arrNum: number[], numPresicion: number): Promise<number> {
        const reducedArr = arrNum.reduce((acum, actual) => acum + actual);
        return Number(reducedArr.toFixed(numPresicion));
    }

    static async fixNumberPresicion(number: number, numPresicion: number): Promise<number> {
        return Number(number.toFixed(numPresicion));
    }
}

export default UtilsMethods;
