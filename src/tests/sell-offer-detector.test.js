import { 
  isSellOffer, 
  analyzeSellOffer, 
  extractAmount, 
  SELL_PATTERNS, 
  EXCLUDED_PATTERNS 
} from '../sell-offer-detector.js';

describe('Sell Offer Detector', () => {
  describe('isSellOffer function', () => {
    // Test cases that SHOULD be detected as sell offers
    describe('should detect valid sell offers', () => {
      const validSellOffers = [
        'Vendo 5000 USDT, MP',
        'Liquido 10.000 USDT transferencia bancaria',
        'Oferta: 2500 USD cripto p2p',
        'Vendo bitcoin 1.5 BTC banco nacional',
        'Dispongo de 3000 USDT sinpe BCR',
        'Cambio dolares 5000 USD cripto',
        'Ofrezco 15.000 USDT p2p BAC',
        'Vendo tether 8000 USDT scotiabank',
        'Liquido 4.500 USD cripto transferencia',
        'Venta ethereum 2 ETH banco popular'
      ];

      test.each(validSellOffers)('should detect: "%s"', (message) => {
        expect(isSellOffer(message)).toBe(true);
      });
    });

    // Test cases that should NOT be detected as sell offers
    describe('should not detect invalid sell offers', () => {
      const invalidOffers = [
        'Compro USDT al mejor precio',
        'Busco 5000 USDT transferencia',
        'Necesito bitcoin urgente',
        'Quiero comprar ethereum',
        'Hola, ¿cuánto el USDT hoy?',
        'Ya vendido, gracias',
        'Precio del bitcoin?',
        'Buenos días grupo',
        'Alguien vende dolares?',
        'VENDIDO - cerrado'
      ];

      test.each(invalidOffers)('should not detect: "%s"', (message) => {
        expect(isSellOffer(message)).toBe(false);
      });
    });

    // Edge cases
    describe('should handle edge cases', () => {
      test('should handle empty string', () => {
        expect(isSellOffer('')).toBe(false);
      });

      test('should handle null/undefined', () => {
        expect(isSellOffer(null)).toBe(false);
        expect(isSellOffer(undefined)).toBe(false);
      });

      test('should handle non-string input', () => {
        expect(isSellOffer(123)).toBe(false);
        expect(isSellOffer({})).toBe(false);
      });

      test('should handle messages with accents', () => {
        expect(isSellOffer('Vendó 5000 USDT')).toBe(false); // Missing crypto + amount combo
        expect(isSellOffer('Vendo 5000 USDT transferéncia')).toBe(true);
      });

      test('should be case insensitive', () => {
        expect(isSellOffer('VENDO 5000 USDT')).toBe(true);
        expect(isSellOffer('vendo 5000 usdt')).toBe(true);
      });
    });
  });

  describe('analyzeSellOffer function', () => {
    test('should provide detailed analysis for sell offer', () => {
      const message = 'Vendo 5000 USDT transferencia BAC';
      const analysis = analyzeSellOffer(message);

      expect(analysis).toHaveProperty('isSellOffer', true);
      expect(analysis).toHaveProperty('confidence');
      expect(analysis).toHaveProperty('matches');
      expect(analysis).toHaveProperty('originalText', message);
      expect(analysis).toHaveProperty('normalizedText');
      
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.matches.sellKeywords).toBe(true);
      expect(analysis.matches.cryptoTerms).toBe(true);
      expect(analysis.matches.amountPatterns).toBe(true);
      expect(analysis.matches.bankingTerms).toBe(true);
    });

    test('should provide analysis for non-sell offer', () => {
      const message = 'Hola grupo, ¿cómo están?';
      const analysis = analyzeSellOffer(message);

      expect(analysis.isSellOffer).toBe(false);
      expect(analysis.confidence).toBeLessThan(0.3);
      expect(Object.values(analysis.matches).every(match => !match)).toBe(true);
    });

    test('should detect excluded patterns', () => {
      const message = 'Compro 5000 USDT transferencia';
      const analysis = analyzeSellOffer(message);

      expect(analysis.isSellOffer).toBe(false);
      expect(analysis.excludedReasons).toBeTruthy();
    });
  });

  describe('extractAmount function', () => {
    test('should extract amount with currency', () => {
      const testCases = [
        { input: 'Vendo 5000 USDT', expected: { amount: '5000', currency: 'USDT' } },
        { input: 'Liquido 10.000 USD', expected: { amount: '10.000', currency: 'USD' } },
        { input: 'Oferta 2.500,50 €', expected: { amount: '2.500,50', currency: '€' } },
        { input: 'Cambio $3000', expected: { amount: '3000', currency: '$' } },
        { input: 'Vendo 1.500.000 ₡', expected: { amount: '1.500.000', currency: '₡' } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractAmount(input);
        expect(result).toBeTruthy();
        expect(result.amount).toBe(expected.amount);
        expect(result.currency.toUpperCase()).toBe(expected.currency.toUpperCase());
      });
    });

    test('should return null when no amount found', () => {
      const testCases = [
        'Hola grupo',
        'Vendo cripto',
        'USDT disponible',
        'Precio bitcoin?'
      ];

      testCases.forEach(input => {
        expect(extractAmount(input)).toBeNull();
      });
    });
  });

  describe('Pattern validation', () => {
    test('SELL_PATTERNS should be valid regex', () => {
      SELL_PATTERNS.forEach((pattern, index) => {
        expect(pattern).toBeInstanceOf(RegExp);
        expect(() => 'test'.match(pattern)).not.toThrow();
      });
    });

    test('EXCLUDED_PATTERNS should be valid regex', () => {
      EXCLUDED_PATTERNS.forEach((pattern, index) => {
        expect(pattern).toBeInstanceOf(RegExp);
        expect(() => 'test'.match(pattern)).not.toThrow();
      });
    });
  });

  describe('Real-world test cases', () => {
    // Test cases based on actual P2P crypto messages
    const realWorldCases = [
      // Positive cases (should detect)
      { message: 'Vendo 15k USDT sinpe 🔥', expected: true },
      { message: 'Liquido 8000 tether transferencia', expected: true },
      { message: 'Oferta BTC 0.5 banco nacional', expected: true },
      { message: 'Dispongo 20000 USD p2p', expected: true },
      { message: 'Venta ETH 3.5 BAC San José', expected: true },
      
      // Negative cases (should not detect)
      { message: 'Compro USDT buen precio', expected: false },
      { message: 'Busco bitcoin urgente', expected: false },
      { message: 'Ya no tengo, vendido', expected: false },
      { message: '¿Precio USDT hoy?', expected: false },
      { message: 'WTB 5000 USDT', expected: false }
    ];

    test.each(realWorldCases)('Real case: "$message" should be $expected', ({ message, expected }) => {
      expect(isSellOffer(message)).toBe(expected);
    });
  });

  describe('Performance tests', () => {
    test('should process messages quickly', () => {
      const message = 'Vendo 5000 USDT transferencia banco nacional';
      const startTime = Date.now();
      
      // Run detection 1000 times
      for (let i = 0; i < 1000; i++) {
        isSellOffer(message);
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 1000;
      
      // Should complete 1000 detections in less than 100ms (0.1ms per detection)
      expect(avgTime).toBeLessThan(100);
    });
  });
});