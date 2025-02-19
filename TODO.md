# Cinépolis WhatsApp Bot Improvements TODO

## 1. Response Time Adjustments 
### File: `index.js`
- [ ] Implement new `calculateTypingTime()` function for more natural delays
- [ ] Add random variation to typing delays (±20%)
- [ ] Enhance typing indicator implementation
- [ ] Add progressive delays based on message length

### File: `utils/delay.js` (new)
- [ ] Create utility functions for handling delays
- [ ] Implement typing simulation logic
- [ ] Add randomization helpers

## 2. Promotion System Enhancement
### File: `prompt.js`
- [ ] Update promotion categories structure
- [ ] Add Comboletos specific prompts
- [ ] Enhance promotion selection logic
- [ ] Update JSON response structure for promotions

### File: `models/promotions.js` (new)
- [ ] Create promotion types structure
- [ ] Implement promotion categorization
- [ ] Add validation rules for promotions

## 3. QR Code System
### File: `promotions.js`
- [ ] Expand QR code structure
- [ ] Add expiration dates
- [ ] Implement unique identifiers
- [ ] Add validation system

## 4. User Preference System
### File: `models/UserPreferences.js` (new)
- [ ] Create UserPreferences class
- [ ] Implement preference tracking
- [ ] Add methods for updating preferences
- [ ] Create preference-based promotion matching

### File: `services/PreferenceService.js` (new)
- [ ] Implement preference storage system
- [ ] Add preference analysis methods
- [ ] Create recommendation engine

## 5. Vista Integration Preparation
### File: `services/VistaIntegration.js` (new)
- [ ] Create base integration class
- [ ] Add payment flow placeholders
- [ ] Implement digital queue structure
- [ ] Add QR code generation methods

## 6. Marketing Database
### File: `services/MarketingTracker.js` (new)
- [ ] Implement interaction logging
- [ ] Create preference tracking system
- [ ] Add campaign integration hooks
- [ ] Implement analytics methods

## 7. Response Templates
### File: `templates/responses.js` (new)
- [ ] Create standardized response templates
- [ ] Add promotion-specific messages
- [ ] Implement personalization tokens
- [ ] Add multi-language support

## 8. Configuration Updates
### File: `config/bot-config.js` (new)
- [ ] Add configurable typing delays
- [ ] Create promotion configuration
- [ ] Add API endpoints configuration
- [ ] Implement environment variables

## 9. Testing
### File: `tests/` (new directory)
- [ ] Create test suite for new features
- [ ] Add promotion validation tests
- [ ] Implement QR code testing
- [ ] Add preference tracking tests

## Priority Order:
1. Response Time Adjustments
2. Promotion System Enhancement
3. QR Code System
4. User Preference System
5. Response Templates
6. Marketing Database
7. Vista Integration Preparation
8. Configuration Updates
9. Testing Implementation

## Notes:
- All new features should follow existing code style guidelines
- Maintain proper error handling throughout
- Add JSDoc documentation for all new methods
- Keep WhatsApp-specific formatting in mind
- Ensure proper emoji usage in responses 🎬 🎟️ 📱