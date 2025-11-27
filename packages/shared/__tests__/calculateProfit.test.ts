import { calculateProfit } from '../src/index';

describe('calculateProfit', () => {
  it('should calculate positive profit correctly', () => {
    const result = calculateProfit({
      shopeePrice: 5000,
      amazonPrice: 3000,
      shopeeFee: 500,
      domesticShipping: 200,
      amazonPoints: 0,
    });

    expect(result.profit).toBe(1300); // 5000 - 3000 - 500 - 200
    expect(result.profitMargin).toBeCloseTo(26, 0);
    expect(result.isViable).toBe(true);
  });

  it('should calculate negative profit (not viable)', () => {
    const result = calculateProfit({
      shopeePrice: 2000,
      amazonPrice: 3000,
      shopeeFee: 300,
      domesticShipping: 200,
      amazonPoints: 0,
    });

    expect(result.profit).toBe(-1500); // 2000 - 3000 - 300 - 200
    expect(result.isViable).toBe(false);
  });

  it('should include Amazon points in calculation', () => {
    const result = calculateProfit({
      shopeePrice: 5000,
      amazonPrice: 3000,
      shopeeFee: 500,
      domesticShipping: 200,
      amazonPoints: 300,
    });

    expect(result.profit).toBe(1600); // 5000 - 3000 - 500 - 200 + 300
    expect(result.isViable).toBe(true);
  });

  it('should handle zero fees', () => {
    const result = calculateProfit({
      shopeePrice: 5000,
      amazonPrice: 3000,
      shopeeFee: 0,
      domesticShipping: 0,
      amazonPoints: 0,
    });

    expect(result.profit).toBe(2000);
    expect(result.profitMargin).toBe(40);
  });

  it('should calculate profit margin correctly', () => {
    const result = calculateProfit({
      shopeePrice: 10000,
      amazonPrice: 5000,
      shopeeFee: 1000,
      domesticShipping: 500,
      amazonPoints: 0,
    });

    expect(result.profit).toBe(3500);
    expect(result.profitMargin).toBe(35); // (3500 / 10000) * 100
  });

  it('should handle edge case with zero Shopee price', () => {
    const result = calculateProfit({
      shopeePrice: 0,
      amazonPrice: 1000,
      shopeeFee: 0,
      domesticShipping: 0,
      amazonPoints: 0,
    });

    expect(result.profit).toBe(-1000);
    expect(result.profitMargin).toBe(0);
    expect(result.isViable).toBe(false);
  });
});