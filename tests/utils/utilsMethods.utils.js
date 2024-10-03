
class UtilsMethods {

    static sortLowToHighValues(arrValues) {
        return arrValues.sort((a, b) => a - b);
    }

    static getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static getSetFromRange(intMinRange, intMaxRange, intSetSize) {
        const setFromRange = new Set();
        do {
            let value = this.getRandomNumber(intMinRange, intMaxRange);
            if (!setFromRange.has(value)) {
                setFromRange.add(value);
            }
        } while (setFromRange.size != intSetSize);

        return setFromRange;
    }

    static async sumArrAndFixPresicion(arrNum, numPresicion) {
        const reducedArr = arrNum.reduce((acum, actual) => acum + actual);
        const sum = await reducedArr.toFixed(numPresicion);
        return Number(sum);
    }
}

export default UtilsMethods;
