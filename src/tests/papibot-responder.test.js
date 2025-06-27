import { 
  buildReply, 
  getResponseStats, 
  validateResponse, 
  getFallbackResponse,
  resetResponseTracking 
} from '../papibot-responder.js';

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T14:30:00.000Z');

describe('Papibot Responder', () => {
  beforeEach(() => {
    // Reset response tracking before each test
    resetResponseTracking();
    // Mock Date.now for consistent time-based tests
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildReply function', () => {
    test('should generate valid pachuco response', () => {
      const response = buildReply();
      
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(validateResponse(response)).toBe(true);
    });

    test('should include papibot identifier', () => {
      const response = buildReply();
      expect(response.toLowerCase()).toContain('papibot');
    });

    test('should include buying intent keywords', () => {
      const response = buildReply();
      const buyingKeywords = ['compro', 'agarro', 'jalo', 'quiero', 'interesado'];
      const hasBuyingIntent = buyingKeywords.some(keyword => 
        response.toLowerCase().includes(keyword)
      );
      expect(hasBuyingIntent).toBe(true);
    });

    test('should generate different responses for variety', () => {
      const responses = new Set();
      
      // Generate 20 responses
      for (let i = 0; i < 20; i++) {
        resetResponseTracking(); // Reset to avoid rate limiting
        const response = buildReply();
        responses.add(response);
      }
      
      // Should have at least some variety (not all identical)
      expect(responses.size).toBeGreaterThan(1);
    });

    test('should handle amount-specific responses', () => {
      const amountData = {
        amount: '5000',
        currency: 'USDT',
        fullMatch: '5000 USDT'
      };
      
      const response = buildReply({ amountData });
      expect(response).toBeTruthy();
      expect(validateResponse(response)).toBe(true);
    });

    test('should respect rate limiting', () => {
      // First response should work
      const firstResponse = buildReply();
      expect(firstResponse).toBeTruthy();
      
      // Immediate second response should be rate limited
      const secondResponse = buildReply();
      expect(secondResponse).toBeNull();
    });
  });

  describe('Rate limiting functionality', () => {
    test('should track responses correctly', () => {
      const initialStats = getResponseStats();
      expect(initialStats.totalResponses).toBe(0);
      
      resetResponseTracking();
      buildReply();
      
      const afterStats = getResponseStats();
      expect(afterStats.totalResponses).toBe(1);
    });

    test('should prevent spam', () => {
      const responses = [];
      
      // Try to generate many responses quickly
      for (let i = 0; i < 20; i++) {
        const response = buildReply();
        if (response) {
          responses.push(response);
        }
      }
      
      // Should be limited to prevent spam
      expect(responses.length).toBeLessThan(20);
    });

    test('should provide accurate stats', () => {
      resetResponseTracking();
      
      // Send a few responses
      buildReply();
      buildReply(); // This should be null due to rate limiting
      
      const stats = getResponseStats();
      expect(stats).toHaveProperty('totalResponses');
      expect(stats).toHaveProperty('responsesLastMinute');
      expect(stats).toHaveProperty('canSendResponse');
      expect(stats).toHaveProperty('timeUntilNextResponse');
    });
  });

  describe('Response validation', () => {
    test('should validate correct responses', () => {
      const validResponses = [
        'Aquí papibot, los compro',
        'Mae, papibot interesado',
        'Papibot presente, ¡los jalo!',
        'Diay, papibot los agarro al toque'
      ];

      validResponses.forEach(response => {
        expect(validateResponse(response)).toBe(true);
      });
    });

    test('should reject invalid responses', () => {
      const invalidResponses = [
        '', // empty
        'Hello world', // no papibot
        'Papibot here', // no buying intent
        null, // null
        undefined, // undefined
        123 // non-string
      ];

      invalidResponses.forEach(response => {
        expect(validateResponse(response)).toBe(false);
      });
    });
  });

  describe('Fallback response', () => {
    test('should provide valid fallback', () => {
      const fallback = getFallbackResponse();
      
      expect(fallback).toBeTruthy();
      expect(typeof fallback).toBe('string');
      expect(validateResponse(fallback)).toBe(true);
      expect(fallback.toLowerCase()).toContain('papibot');
      expect(fallback.toLowerCase()).toContain('compro');
    });
  });

  describe('Costa Rican authenticity', () => {
    test('should include Costa Rican expressions', () => {
      const responses = [];
      const crExpressions = ['mae', 'diay', 'tuanis', 'pura vida'];
      
      // Generate multiple responses to check for CR expressions
      for (let i = 0; i < 50; i++) {
        resetResponseTracking();
        const response = buildReply();
        if (response) {
          responses.push(response.toLowerCase());
        }
      }
      
      // At least some responses should contain CR expressions
      const responsesWithCR = responses.filter(response =>
        crExpressions.some(expr => response.includes(expr))
      );
      
      expect(responsesWithCR.length).toBeGreaterThan(0);
    });

    test('should maintain pachuco style', () => {
      const response = buildReply();
      
      // Should be casual/informal style
      expect(response).toBeTruthy();
      expect(response.toLowerCase()).toMatch(/papibot/);
      
      // Should not be overly formal
      expect(response.toLowerCase()).not.toMatch(/estimado|cordialmente|atentamente/);
    });
  });

  describe('Time-based responses', () => {
    test('should provide different responses for different times', () => {
      // Mock different times of day
      const times = [
        new Date('2024-01-15T08:00:00.000Z'), // morning
        new Date('2024-01-15T14:00:00.000Z'), // afternoon  
        new Date('2024-01-15T20:00:00.000Z')  // evening
      ];

      const responses = times.map(time => {
        resetResponseTracking();
        jest.spyOn(Date, 'now').mockReturnValue(time.getTime());
        jest.spyOn(global, 'Date').mockImplementation(() => time);
        
        return buildReply();
      });

      // All should be valid
      responses.forEach(response => {
        expect(response).toBeTruthy();
        expect(validateResponse(response)).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    test('should generate responses quickly', () => {
      resetResponseTracking();
      
      const startTime = Date.now();
      
      // Generate 100 responses
      for (let i = 0; i < 100; i++) {
        resetResponseTracking(); // Reset to avoid rate limiting affecting performance
        buildReply();
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second for 100 generations)
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle real sell offer scenarios', () => {
      const realScenarios = [
        {
          originalMessage: 'Vendo 5000 USDT transferencia BAC',
          amountData: { amount: '5000', currency: 'USDT' }
        },
        {
          originalMessage: 'Liquido 10k tether sinpe',
          amountData: { amount: '10k', currency: 'tether' }
        },
        {
          originalMessage: 'Oferta bitcoin 1.5 BTC',
          amountData: { amount: '1.5', currency: 'BTC' }
        }
      ];

      realScenarios.forEach(scenario => {
        resetResponseTracking();
        const response = buildReply({
          originalMessage: scenario.originalMessage,
          amountData: scenario.amountData
        });
        
        expect(response).toBeTruthy();
        expect(validateResponse(response)).toBe(true);
      });
    });

    test('should maintain consistency under load', () => {
      const responses = [];
      
      // Simulate high load scenario
      for (let i = 0; i < 10; i++) {
        resetResponseTracking();
        const response = buildReply();
        if (response) {
          responses.push(response);
        }
      }
      
      // All generated responses should be valid
      responses.forEach(response => {
        expect(validateResponse(response)).toBe(true);
      });
    });
  });
});