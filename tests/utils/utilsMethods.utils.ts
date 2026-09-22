class UtilsMethods {
    /**
     * Returns a sorted COPY. `Array.prototype.sort` sorts in place, so sorting
     * the argument directly would silently reorder the caller's array.
     */
    static sortLowToHighValues(values: string[]): string[] {
        return [...values].sort((a, b) => Number(a) - Number(b));
    }

    /**
     * Converts a product name into the slug SauceDemo uses in its `data-test`
     * attributes: "Sauce Labs Bike Light" -> "sauce-labs-bike-light".
     *
     * This is what lets locators target a specific product without matching on
     * its visible text, which breaks on whitespace and copy changes.
     */
    static toProductSlug(productName: string): string {
        return productName.trim().toLowerCase().replace(/\s+/g, '-');
    }

    /**
     * The initial value matters: `reduce` with no initial value throws
     * "Reduce of empty array with no initial value" on an empty cart.
     */
    static sumArrAndFixPrecision(numbers: number[], precision: number): number {
        const reducedArr = numbers.reduce((acum, actual) => acum + actual, 0);
        return Number(reducedArr.toFixed(precision));
    }

    static fixNumberPrecision(number: number, precision: number): number {
        return Number(number.toFixed(precision));
    }
}

export default UtilsMethods;
