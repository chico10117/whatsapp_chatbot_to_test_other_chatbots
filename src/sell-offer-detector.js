const SELL_PATTERNS = [
  // Sell keywords in Spanish (Costa Rica context)
  /\b(vendo|venta|liquido|liquidar|oferta|dispongo|cambio|ofrezco)\b/i,
  
  // Cryptocurrency tickers and terms - EXPANDED for Costa Rica context
  /\b(usdt|btc|eth|tether|binance|cripto|bitcoin|ethereum|dai|usdc|busd|bnb|dolar|dolares|crypto)\b/i,
  
  // Amount patterns - IMPROVED for Costa Rican formats
  /(\b\d{1,3}(\s?\d{3})*(\s?\d{3})*(\.\d{3})*(,\d+)?\s*(usd|usdt|eur|€|\$|₡|colones|de\s+colones)\b)|(\ba\s+\d{2,4}\b)/i,
  
  // P2P specific terms
  /\b(p2p|peer.to.peer|transferencia|sinpevueltas|intercambio|cambio)\b/i,
  
  // Costa Rican banking terms
  /\b(bac|bcr|banco|nacional|popular|scotiabank|promerica|coopeservidores)\b/i,
  
  // Costa Rican P2P context indicators - NEW PATTERN (more specific)
  /\b(colones?|₡|(a\s+\d{2,4}(?:\s*colones?)?)|tasa\s+de|tipo\s+de\s+cambio|rate)\b/i
];

const EXCLUDED_PATTERNS = [
  // Exclude buy offers
  /\b(compro|busco|necesito|quiero.comprar|buying|want.to.buy|wtb|want)\b/i,
  
  // Exclude questions or requests for information  
  /\b(pregunta|consulta|\?|cuanto|precio|como|donde|quien|verdad|puede|puedo|sabe|conoce|info|informacion)\b/i,
  
  // Exclude completed transactions
  /\b(vendido|sold|completado|cerrado|ya.no)\b/i,
  
  // Exclude discussions about platforms/methods
  /\b(telegram|whatsapp|facebook|instagram|plataforma|aplicacion|grupo|grupos|anuncio|anuncios)\b/i
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

  // Must match at least 2 out of main patterns for sell offer detection
  let matchCount = 0;
  
  // Check sell keywords
  if (SELL_PATTERNS[0].test(normalizedText)) matchCount++;
  
  // Check crypto terms OR Costa Rican P2P context (colones trading)
  if (SELL_PATTERNS[1].test(normalizedText) || SELL_PATTERNS[5].test(normalizedText)) matchCount++;
  
  // Check amount patterns (improved for Costa Rican formats)
  if (SELL_PATTERNS[2].test(normalizedText)) matchCount++;

  // Additional bonus for P2P or banking terms
  if (SELL_PATTERNS[3].test(normalizedText) || SELL_PATTERNS[4].test(normalizedText)) {
    matchCount++;
  }

  // For Costa Rican context: "vendo X colones" + rate = sell offer
  const hasCostaRicanPattern = SELL_PATTERNS[0].test(normalizedText) && SELL_PATTERNS[5].test(normalizedText);
  if (hasCostaRicanPattern) {
    matchCount += 2; // Boost for clear Costa Rican sell pattern
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
    bankingTerms: SELL_PATTERNS[4].test(normalizedText),
    costaRicanContext: SELL_PATTERNS[5].test(normalizedText)
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
  // Costa Rican format: "2 000 000 de colones" or "a 450" (USDT rate)
  const costaRicanAmountRegex = /(\d{1,3}(?:\s?\d{3})*(?:\s?\d{3})*)\s*(de\s+)?colones?/i;
  const rateRegex = /\ba\s+(\d{2,4})\b/i;
  const standardAmountRegex = /\b(\d{1,}(?:\.\d{3})*(?:,\d+)?)\s*(usdt|usd|eur|€|\$|₡|btc|eth)/i;
  
  // Try Costa Rican colones format first
  let match = text.match(costaRicanAmountRegex);
  if (match) {
    return {
      amount: match[1].replace(/\s/g, ''), // Remove spaces from number
      currency: 'colones',
      fullMatch: match[0],
      type: 'selling_colones_for_usdt'
    };
  }
  
  // Try USDT rate format ("a 450")
  match = text.match(rateRegex);
  if (match) {
    return {
      amount: match[1],
      currency: 'usdt_rate',
      fullMatch: match[0],
      type: 'usdt_rate_in_colones'
    };
  }
  
  // Try standard crypto format  
  match = text.match(standardAmountRegex);
  if (match) {
    return {
      amount: match[1],
      currency: match[2],
      fullMatch: match[0],
      type: 'standard_crypto'
    };
  }
  
  // Try additional formats for backward compatibility
  const additionalRegex = /\b(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(usdt|btc|eth|usd|eur)\b/i;
  match = text.match(additionalRegex);
  if (match) {
    return {
      amount: match[1],
      currency: match[2],
      fullMatch: match[0],
      type: 'standard_crypto'
    };
  }
  
  return null;
}

// Export patterns for testing and debugging
export { SELL_PATTERNS, EXCLUDED_PATTERNS };