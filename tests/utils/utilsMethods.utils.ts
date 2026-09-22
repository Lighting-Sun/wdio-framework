class UtilsMethods {

    /**
     * Returns a sorted COPY. `Array.prototype.sort` sorts in place, so sorting
     * the argument directly would silently reorder the caller's array.
     */
    static sortLowToHighValues(arrValues: string[]): string[] {
        return [...arrValues].sort((a, b) => Number(a) - Number(b));
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

    /**
     * The initial value matters: `reduce` with no initial value throws
     * "Reduce of empty array with no initial value" on an empty cart.
     */
    static sumArrAndFixPresicion(arrNum: number[], numPresicion: number): number {
        const reducedArr = arrNum.reduce((acum, actual) => acum + actual, 0);
        return Number(reducedArr.toFixed(numPresicion));
    }

    static fixNumberPresicion(number: number, numPresicion: number): number {
        return Number(number.toFixed(numPresicion));
    }
}

export default UtilsMethods;
