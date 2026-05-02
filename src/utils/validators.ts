export function isValidPurity(purity: number): boolean {
    return purity > 0 && purity <= 1;
}

export function isValidWeight(weight: number): boolean {
    return isFinite(weight) && weight > 0;
}

export function isValidQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity >= 1;
}

export function isValidYear(year: number): boolean {
    const currentYear = new Date().getFullYear();
    return Number.isInteger(year) && year >= 1800 && year <= currentYear + 1;
}

export function isValidPrice(price: number): boolean {
    return isFinite(price) && price >= 0;
}

export function isValidExchangeRate(rate: number): boolean {
    return isFinite(rate) && rate > 0;
}
