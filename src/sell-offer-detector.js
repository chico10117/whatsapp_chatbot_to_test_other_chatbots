const SELL_PATTERNS = [
  // Sell keywords in Spanish (Costa Rica context)
  /\b(vendo|venta|liquido|liquidar|oferta|dispongo|cambio|ofrezco)\b/i,
  
  // Cryptocurrency tickers and terms
  /\b(usdt|btc|eth|tether|binance|cripto|bitcoin|ethereum|dai|usdc|busd|bnb|dolar|dolares)\b/i,
  
  // Amount patterns with various formats
  /\b\d{1,3}(\.\d{3})*(,\d+)?\s*(usd|usdt|eur|€|\$|₡|colones)\b/i,
  
  // P2P specific terms
  /\b(p2p|peer.to.peer|transferencia|sinpevueltas|intercambio|cambio)\b/i,
  
  // Costa Rican banking terms
  /\b(bac|bcr|banco|nacional|popular|scotiabank|promerica|coopeservidores)\b/i
];

const EXCLUDED_PATTERNS = [
  // Exclude buy offers
  /\b(compro|busco|necesito|quiero.comprar|buying|want.to.buy)\b/i,
  
  // Exclude questions or requests for information
  /\b(pregunta|consulta|\?|cuanto|precio|como|donde|quien)\b/i,
  
  // Exclude completed transactions
  /\b(vendido|sold|completado|cerrado|ya.no)\b/i
];

/**
 * Detects if a message text appears to be a sell offer for P2P cryptocurrency trading
 * Uses AND logic: must match sell patterns without matching excluded patterns
 * @param {string} text - The message text to analyze
 * @returns {boolean} - True if the text appears to be a sell offer
 */
export function isSellOffer(text = '') {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Normalize text: remove accents, convert to lowercase
  const normalizedText = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim();

  // Must not match any excluded patterns
  const hasExcludedPattern = EXCLUDED_PATTERNS.some(pattern => pattern.test(normalizedText));
  if (hasExcludedPattern) {
    return false;
  }

  // Must match at least 2 out of 3 main sell pattern categories
  let matchCount = 0;
  
  // Check sell keywords
  if (SELL_PATTERNS[0].test(normalizedText)) matchCount++;
  
  // Check crypto terms  
  if (SELL_PATTERNS[1].test(normalizedText)) matchCount++;
  
  // Check amount patterns
  if (SELL_PATTERNS[2].test(normalizedText)) matchCount++;

  // Additional bonus for P2P or banking terms
  if (SELL_PATTERNS[3].test(normalizedText) || SELL_PATTERNS[4].test(normalizedText)) {
    matchCount++;
  }

  // Require at least 2 matches for positive detection
  return matchCount >= 2;
}

/**
 * Analyzes a message and provides detailed information about why it was or wasn't classified as a sell offer
 * @param {string} text - The message text to analyze
 * @returns {object} - Analysis details including matches and confidence score
 */
export function analyzeSellOffer(text = '') {
  const normalizedText = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const matches = {
    sellKeywords: SELL_PATTERNS[0].test(normalizedText),
    cryptoTerms: SELL_PATTERNS[1].test(normalizedText),
    amountPatterns: SELL_PATTERNS[2].test(normalizedText),
    p2pTerms: SELL_PATTERNS[3].test(normalizedText),
    bankingTerms: SELL_PATTERNS[4].test(normalizedText)
  };

  const excludedMatches = EXCLUDED_PATTERNS.map(pattern => pattern.test(normalizedText));
  const hasExclusions = excludedMatches.some(match => match);

  const matchCount = Object.values(matches).filter(Boolean).length;
  const confidenceScore = Math.min(matchCount / 3, 1.0); // Max confidence is 1.0

  return {
    isSellOffer: isSellOffer(text),
    confidence: confidenceScore,
    matches,
    excludedReasons: hasExclusions ? excludedMatches : null,
    originalText: text,
    normalizedText
  };
}

/**
 * Extracts potential amount and currency from the message
 * @param {string} text - The message text to analyze
 * @returns {object|null} - Object with amount and currency, or null if not found
 */
export function extractAmount(text = '') {
  const amountRegex = /\b(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(usd|usdt|eur|€|\$|₡|colones)/i;
  const match = text.match(amountRegex);
  
  if (match) {
    return {
      amount: match[1],
      currency: match[2],
      fullMatch: match[0]
    };
  }
  
  return null;
}

// Export patterns for testing and debugging
export { SELL_PATTERNS, EXCLUDED_PATTERNS };