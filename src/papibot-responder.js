/**
 * Papibot Responder - Costa Rican Pachuco Style Responses
 * Generates authentic Costa Rican slang responses for P2P crypto offers
 */

// Base responses in Costa Rican pachuco style
const BASE_RESPONSES = [
  'Aquí papibot, los compro',
  'Pura vida, los agarra el papibot', 
  'Mae, ¡los jalo yo!',
  '¡Diay! Papibot los compra al toque',
  'Esos los agarro, papibot aquí',
  'Mae, papibot interesado',
  'Aquí ando, los compro',
  'Papibot presente, ¡los jalo!',
  'Mae, ¿cuánto? Papibot compra',
  'Tuanis, los quiero'
];

// Emotional intensifiers
const INTENSIFIERS = [
  '¡',
  '¡¡',
  '🔥',
  '💰',
  '⚡',
  '🚀',
  '💪',
  '👑'
];

// Costa Rican expressions to add variety
const CR_EXPRESSIONS = [
  'mae',
  'diay',
  'tuanis',
  'pura vida',
  'qué tal',
  'upe',
  'al chile'
];

// Time-based responses for more authenticity
const TIME_RESPONSES = {
  morning: [
    'Buenos días mae, papibot los compra',
    'Upe, papibot aquí desde temprano',
    'Mae, papibot madrugando por los cripto'
  ],
  afternoon: [
    'Buenas tardes, papibot interesado',
    'Mae, papibot aquí en la tarde',
    'Papibot presente, ¿cuánto pide?'
  ],
  evening: [
    'Buenas noches mae, los compro',
    'Papibot nocturno, ¡los jalo!',
    'Mae, hasta tarde anda papibot comprando'
  ]
};

// Amount-specific responses when amount is detected
const AMOUNT_RESPONSES = [
  'Mae, esos {amount} los agarro',
  'Papibot interesado en los {amount}',
  '¡Diay! {amount} al toque',
  'Tuanis, esos {amount} los compro',
  'Mae, {amount} suena bien para papibot'
];

/**
 * Rate limiting tracking to avoid spam detection
 */
let lastResponseTime = 0;
let responseCount = 0;
const RATE_LIMIT_WINDOW = 2000; // 2 seconds minimum between responses
const MAX_RESPONSES_PER_MINUTE = 15;
const responseHistory = [];

/**
 * Generates a response in Costa Rican pachuco style
 * @param {object} options - Configuration options
 * @param {string} options.originalMessage - The original sell offer message
 * @param {object} options.amountData - Extracted amount information if available
 * @param {boolean} options.addIntensifier - Whether to add emotional intensifiers
 * @returns {string} - Generated response in pachuco style
 */
export function buildReply(options = {}) {
  const {
    originalMessage = '',
    amountData = null,
    addIntensifier = Math.random() > 0.5
  } = options;

  // Check rate limiting
  if (!canSendResponse()) {
    console.log('🚫 Papibot rate limited, skipping response');
    return null;
  }

  let response;

  // Use amount-specific response if amount detected
  if (amountData && Math.random() > 0.3) {
    response = getAmountSpecificResponse(amountData);
  } else {
    // Use time-based response occasionally
    if (Math.random() > 0.7) {
      response = getTimeBasedResponse();
    } else {
      response = getRandomBaseResponse();
    }
  }

  // Add variety with expressions
  if (Math.random() > 0.6) {
    response = addCostaRicanExpression(response);
  }

  // Add intensifiers occasionally
  if (addIntensifier && Math.random() > 0.4) {
    response = addIntensifier(response);
  }

  // Track response for rate limiting
  trackResponse();

  return response;
}

/**
 * Gets a random base response with variation
 * @returns {string} - Random base response
 */
function getRandomBaseResponse() {
  const responses = [...BASE_RESPONSES];
  
  // Add some variation to avoid exact repetition
  if (Math.random() > 0.8) {
    responses.push(
      'Papibot anda cazando, ¡los compro!',
      'Mae, papibot siempre listo',
      'Aquí su servidor, papibot comprando'
    );
  }

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Gets time-appropriate response based on current hour
 * @returns {string} - Time-based response
 */
function getTimeBasedResponse() {
  const hour = new Date().getHours();
  let timeCategory;

  if (hour >= 6 && hour < 12) {
    timeCategory = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeCategory = 'afternoon';
  } else {
    timeCategory = 'evening';
  }

  const responses = TIME_RESPONSES[timeCategory];
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Gets amount-specific response when amount is detected
 * @param {object} amountData - Extracted amount and currency information
 * @returns {string} - Amount-specific response
 */
function getAmountSpecificResponse(amountData) {
  const template = AMOUNT_RESPONSES[Math.floor(Math.random() * AMOUNT_RESPONSES.length)];
  return template.replace('{amount}', `${amountData.amount} ${amountData.currency}`);
}

/**
 * Adds Costa Rican expressions to responses for authenticity
 * @param {string} response - Base response
 * @returns {string} - Response with added expression
 */
function addCostaRicanExpression(response) {
  const expression = CR_EXPRESSIONS[Math.floor(Math.random() * CR_EXPRESSIONS.length)];
  
  // Add expression at the beginning or end randomly
  if (Math.random() > 0.5) {
    return `${expression}, ${response.toLowerCase()}`;
  } else {
    return `${response}, ${expression}`;
  }
}

/**
 * Adds emotional intensifiers to responses
 * @param {string} response - Base response
 * @returns {string} - Response with intensifier
 */
function addIntensifier(response) {
  const intensifier = INTENSIFIERS[Math.floor(Math.random() * INTENSIFIERS.length)];
  
  if (intensifier.length === 1) {
    // Text intensifier - add at beginning
    return `${intensifier}${response}`;
  } else {
    // Emoji intensifier - add at end
    return `${response} ${intensifier}`;
  }
}

/**
 * Checks if we can send a response based on rate limiting
 * @returns {boolean} - True if response can be sent
 */
function canSendResponse() {
  const now = Date.now();
  
  // Check minimum time between responses
  if (now - lastResponseTime < RATE_LIMIT_WINDOW) {
    return false;
  }

  // Clean old responses from history (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  while (responseHistory.length > 0 && responseHistory[0] < oneMinuteAgo) {
    responseHistory.shift();
  }

  // Check max responses per minute
  if (responseHistory.length >= MAX_RESPONSES_PER_MINUTE) {
    return false;
  }

  return true;
}

/**
 * Tracks a response for rate limiting purposes
 */
function trackResponse() {
  const now = Date.now();
  lastResponseTime = now;
  responseHistory.push(now);
  responseCount++;
}

/**
 * Gets statistics about response activity
 * @returns {object} - Response statistics
 */
export function getResponseStats() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const recentResponses = responseHistory.filter(time => time > oneMinuteAgo);

  return {
    totalResponses: responseCount,
    responsesLastMinute: recentResponses.length,
    lastResponseTime: new Date(lastResponseTime).toISOString(),
    canSendResponse: canSendResponse(),
    timeUntilNextResponse: Math.max(0, RATE_LIMIT_WINDOW - (now - lastResponseTime))
  };
}

/**
 * Resets response tracking (useful for testing)
 */
export function resetResponseTracking() {
  lastResponseTime = 0;
  responseCount = 0;
  responseHistory.length = 0;
}

/**
 * Validates if a generated response meets quality standards
 * @param {string} response - Generated response
 * @returns {boolean} - True if response is valid
 */
export function validateResponse(response) {
  if (!response || typeof response !== 'string') {
    return false;
  }

  // Must contain papibot identifier
  if (!response.toLowerCase().includes('papibot')) {
    return false;
  }

  // Must indicate buying interest
  const buyingKeywords = ['compro', 'agarro', 'jalo', 'quiero', 'interesado'];
  const hasBuyingIntent = buyingKeywords.some(keyword => 
    response.toLowerCase().includes(keyword)
  );

  return hasBuyingIntent;
}

/**
 * Emergency fallback response when all else fails
 * @returns {string} - Simple fallback response
 */
export function getFallbackResponse() {
  return 'Aquí papibot, los compro';
}