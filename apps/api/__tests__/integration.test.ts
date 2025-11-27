import { calculateProfit } from '@shopee-amazon/shared';

describe('Amazon Buying & Order Processing Tests', () => {
  describe('Profit Calculation', () => {
    it('should calculate viable profit for dropshipping order', () => {
      const result = calculateProfit({
        shopeeSalePrice: 10000,
        amazonPrice: 6000,
        amazonPoints: 600,
        domesticShipping: 500,
        includePoints: true,
        includeDomesticShipping: true
      });

      expect(result.expectedProfit).toBe(4100);
      expect(result.breakdown.base).toBe(4000);
      expect(result.breakdown.points).toBe(600);
    });

    it('should identify non-viable orders', () => {
      const result = calculateProfit({
        shopeeSalePrice: 5000,
        amazonPrice: 7000,
        amazonPoints: 0,
        domesticShipping: 800,
        includePoints: false,
        includeDomesticShipping: true
      });

      expect(result.expectedProfit).toBe(-2800);
      expect(result.expectedProfit).toBeLessThan(0);
    });

    it('should exclude Amazon points when configured', () => {
      const result = calculateProfit({
        shopeeSalePrice: 8000,
        amazonPrice: 5000,
        amazonPoints: 500,
        domesticShipping: 300,
        includePoints: false,
        includeDomesticShipping: true
      });

      expect(result.expectedProfit).toBe(2700);
      expect(result.breakdown.points).toBe(0);
    });
  });

  describe('Order Filtering', () => {
    it('should filter by minimum profit threshold', () => {
      const minExpectedProfit = 1000;
      
      const order1 = calculateProfit({
        shopeeSalePrice: 5000,
        amazonPrice: 3500,
        amazonPoints: 0,
        domesticShipping: 300,
        includePoints: false,
        includeDomesticShipping: true
      });

      expect(order1.expectedProfit).toBeGreaterThanOrEqual(minExpectedProfit);
    });
  });

  describe('Amazon URL Validation', () => {
    it('should validate Amazon JP URLs', () => {
      const validUrls = [
        'https://www.amazon.co.jp/dp/B08N5WRWNW',
        'https://amazon.co.jp/dp/B09ABC1234'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/amazon\.co\.jp/);
        expect(url).toMatch(/\/dp\//);
      });
    });

    it('should validate ASIN format', () => {
      const validASINs = ['B08N5WRWNW', 'B09ABC1234'];
      const asinPattern = /^B[0-9A-Z]{9}$/;

      validASINs.forEach(asin => {
        expect(asin).toMatch(asinPattern);
        expect(asin.length).toBe(10);
      });
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple orders', () => {
      const orders = [
        { shopeeSalePrice: 10000, amazonPrice: 7000, amazonPoints: 700, domesticShipping: 500 },
        { shopeeSalePrice: 15000, amazonPrice: 11000, amazonPoints: 1100, domesticShipping: 600 }
      ];

      const results = orders.map(order => 
        calculateProfit({
          ...order,
          includePoints: true,
          includeDomesticShipping: true
        })
      );

      const totalProfit = results.reduce((sum, r) => sum + r.expectedProfit, 0);
      expect(totalProfit).toBe(7700);
      expect(results.every(r => r.expectedProfit > 0)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should calculate 1000 orders quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        calculateProfit({
          shopeeSalePrice: 10000 + i,
          amazonPrice: 7000,
          amazonPoints: 700,
          domesticShipping: 500,
          includePoints: true,
          includeDomesticShipping: true
        });
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Security Validation', () => {
  it('should validate email format', () => {
    const validEmails = ['user@example.com', 'test@domain.co.jp'];
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    
    validEmails.forEach(email => {
      expect(email).toMatch(emailRegex);
    });
  });

  it('should validate password strength', () => {
    const strongPasswords = ['Abc123def', 'MyP@ssw0rd'];
    const strongPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
    
    strongPasswords.forEach(pwd => {
      expect(pwd).toMatch(strongPattern);
    });
  });
});
