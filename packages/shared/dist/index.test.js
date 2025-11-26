"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("./index");
(0, vitest_1.describe)("calculateProfit", () => {
    (0, vitest_1.it)("includes points and domestic shipping when toggled", () => {
        const result = (0, index_1.calculateProfit)({
            shopeeSalePrice: 15000,
            amazonPrice: 10000,
            amazonPoints: 500,
            domesticShipping: 800,
            includePoints: true,
            includeDomesticShipping: true
        });
        (0, vitest_1.expect)(result.expectedProfit).toBe(15000 - 10000 + 500 - 800);
        (0, vitest_1.expect)(result.breakdown).toEqual({ base: 5000, points: 500, domesticShipping: 800 });
    });
    (0, vitest_1.it)("excludes points and domestic shipping when toggled off", () => {
        const result = (0, index_1.calculateProfit)({
            shopeeSalePrice: 15000,
            amazonPrice: 10000,
            amazonPoints: 500,
            domesticShipping: 800,
            includePoints: false,
            includeDomesticShipping: false
        });
        (0, vitest_1.expect)(result.expectedProfit).toBe(5000);
        (0, vitest_1.expect)(result.breakdown).toEqual({ base: 5000, points: 0, domesticShipping: 0 });
    });
});
(0, vitest_1.describe)("calculateShippingDays", () => {
    (0, vitest_1.it)("calculates positive day difference", () => {
        const today = new Date("2024-01-01");
        const delivery = new Date("2024-01-05");
        (0, vitest_1.expect)((0, index_1.calculateShippingDays)(delivery, today)).toBe(4);
        (0, vitest_1.expect)((0, index_1.shippingDaysWithinLimit)(delivery, today, 5)).toBe(true);
        (0, vitest_1.expect)((0, index_1.shippingDaysWithinLimit)(delivery, today, 3)).toBe(false);
    });
    (0, vitest_1.it)("returns zero or greater", () => {
        const today = new Date("2024-01-05");
        const delivery = new Date("2024-01-04");
        (0, vitest_1.expect)((0, index_1.calculateShippingDays)(delivery, today)).toBe(0);
    });
});
