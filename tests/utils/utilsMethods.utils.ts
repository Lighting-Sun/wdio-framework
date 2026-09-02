class UtilsMethods {

    static sortLowToHighValues(arrValues: string[]): string[] {
        return arrValues.sort((a, b) => Number(a) - Number(b));
    }

    static getRandomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static getSetFromRange(intMinRange: number, intMaxRange: number, intSetSize: number): Set<number> {
        const setFromRange = new Set<number>();
        do {
            const value = this.getRandomNumber(intMinRange, intMaxRange);
            if (!setFromRange.has(value)) {
                setFromRange.add(value);
            }
        } while (setFromRange.size !== intSetSize);

        return setFromRange;
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
