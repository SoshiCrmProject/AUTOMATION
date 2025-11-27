import { calculateProfit } from '../src/index';

describe('calculateProfit', () => {
  it('should calculate positive profit correctly', () => {
    const result = calculateProfit({
      shopeeSalePrice: 5000,
      amazonPrice: 3000,
      amazonPoints: 0,
      domesticShipping: 200,
      includePoints: false,
      includeDomesticShipping: true
    });

    expect(result.expectedProfit).toBe(1800);
    expect(result.breakdown.base).toBe(2000);
  });

  it('should calculate negative profit', () => {
    const result = calculateProfit({
      shopeeSalePrice: 2000,
      amazonPrice: 3000,
      amazonPoints: 0,
      domesticShipping: 200,
      includePoints: false,
      includeDomesticShipping: true
    });

    expect(result.expectedProfit).toBe(-1200);
  });

  it('should include Amazon points', () => {
    const result = calculateProfit({
      shopeeSalePrice: 5000,
      amazonPrice: 3000,
      amazonPoints: 300,
      domesticShipping: 200,
      includePoints: true,
      includeDomesticShipping: true
    });

    expect(result.expectedProfit).toBe(2100);
    expect(result.breakdown.points).toBe(300);
  });

  it('should handle zero fees', () => {
    const result = calculateProfit({
      shopeeSalePrice: 5000,
      amazonPrice: 3000,
      amazonPoints: 0,
      domesticShipping: 0,
      includePoints: false,
      includeDomesticShipping: false
    });

    expect(result.expectedProfit).toBe(2000);
  });

  it('should calculate with all options', () => {
    const result = calculateProfit({
      shopeeSalePrice: 10000,
      amazonPrice: 5000,
      amazonPoints: 500,
      domesticShipping: 1000,
      includePoints: true,
      includeDomesticShipping: true
    });

    expect(result.expectedProfit).toBe(4500);
  });

  it('should handle edge case with zero sale price', () => {
    const result = calculateProfit({
      shopeeSalePrice: 0,
      amazonPrice: 1000,
      amazonPoints: 0,
      domesticShipping: 0,
      includePoints: false,
      includeDomesticShipping: false
    });

    expect(result.expectedProfit).toBe(-1000);
  });
});
