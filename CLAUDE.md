# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-purpose WhatsApp chatbot project with testing frameworks:

1. **Paloma Bot** (`index.js`) - A Cinépolis movie recommendation chatbot for Mexican cinema chain customers
2. **BOTTY Testing System** (`botty.js`) - An automated testing framework that evaluates the RECO restaurant recommendation bot using AI-powered personas
3. **PALOMA TESTER** (`paloma-tester.js`) - An automated testing framework that evaluates the Cinépolis Paloma bot using 5 Mexican personas

## Common Development Commands

### Main Applications
```bash
# Start Paloma (Cinépolis bot)
npm start
# or
node index.js

# Start BOTTY (testing system for RECO bot)
npm run test-reco
# or
node botty.js

# Start PALOMA TESTER (testing system for Cinépolis bot)
npm run test-paloma
# or
node paloma-tester.js

# Development mode with verbose logging
npm run test-reco-dev
npm run test-paloma-dev
```

### Dependency Management
```bash
# Install dependencies
yarn install
# or
npm install
```

### Testing & Analysis
```bash
# Analyze test results
npm run analyze-logs

# Test response timing
npm run test-response-wait
```

## Architecture Overview

### Core Components

**Paloma Bot (index.js)**
- WhatsApp Web integration using @whiskeysockets/baileys
- OpenAI GPT-4 integration for conversation handling
- Queue-based message processing with p-queue
- Cinema data fetching from Cinépolis websites
- QR code promotion system with 6 different promotions
- Persistent session management with WhatsApp Web

**BOTTY Testing Framework**
- 5 AI-powered personas testing RECO bot (+593 99 417 0801)
- 75 dynamic questions total (15 per persona)
- OpenAI-powered response analysis and scoring
- Comprehensive test reporting and metrics
- JSON-based test result storage

**PALOMA TESTER Framework**
- 5 Mexican personas testing Cinépolis Paloma bot
- 75 cinema-focused questions (15 per persona)
- QR code promotion validation and analysis
- Cultural appropriateness and demographic targeting
- Spanish language and Mexican cultural context evaluation

### Key Modules

**BOTTY Framework Modules:**
- `src/test-orchestrator.js` - Test execution engine
- `src/test-personas.js` - AI persona definitions and behavior
- `src/ai-conversation-generator.js` - Dynamic question generation
- `src/response-analyzer.js` - OpenAI response analysis
- `src/feedback-generator.js` - Report generation

**PALOMA TESTER Framework Modules:**
- `src/cinepolis-test-orchestrator.js` - Cinépolis test execution engine
- `src/cinepolis-test-personas.js` - Mexican user persona definitions
- `src/cinepolis-response-analyzer.js` - Cinema-specific response analysis
- `src/cinepolis-feedback-generator.js` - Cinépolis-specific report generation

**Shared Modules:**
- `src/test-logger.js` - Logging utilities
- `prompt.js` - Prompt templates and conversation handling
- `cinepolis-fetcher.js` - Cinema data scraping
- `promotions.js` - QR promotion definitions

## Environment Configuration

Required environment variables in `.env`:

```env
# Required for both applications
OPENAI_API_KEY=your_openai_api_key_here

# For Paloma bot (cinema data scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key

# For BOTTY testing system
RECO_WHATSAPP_NUMBER=+593994170801

# For PALOMA TESTER system  
PALOMA_WHATSAPP_NUMBER=34624330565@s.whatsapp.net

# Common testing configuration
TEST_TIMEOUT_MS=30000
LOG_LEVEL=info
ANALYSIS_MODEL=gpt-4o
```

## Technical Details

### WhatsApp Integration
- Uses @whiskeysockets/baileys for WhatsApp Web API
- Session data stored in `store_wa-session/` directory
- QR code authentication required on first run
- Persistent session management across restarts

### AI Integration
- OpenAI GPT-4 for conversation handling and response analysis
- Custom prompt templates for different conversation contexts
- Dynamic conversation generation for testing scenarios
- Response quality analysis and scoring

### Data Flow

**Paloma Bot Flow:**
```
User Message → Queue → Prompt Builder → OpenAI → JSON Response → QR Logic → WhatsApp Response
```

**BOTTY Testing Flow:**
```
Initialize → 5 Personas → 75 Questions → Response Collection → AI Analysis → Report Generation
```

**PALOMA TESTER Flow:**
```
Initialize → 5 Mexican Personas → 75 Cinema Questions → QR Collection → Cultural Analysis → Report Generation
```

### File Structure Patterns

- Main application files in root directory
- Testing framework modules in `src/` directory
- Test results stored in `test-logs/` with timestamp-based filenames
- QR code images in `qr/` directory
- WhatsApp session data in `store_wa-session/` (excluded from git)

## Development Guidelines

### Code Style (from .cursorrules)
- Use 2-space indentation
- Meaningful variable names and single-purpose functions
- Async/await for asynchronous operations
- Proper error handling and API timeout handling
- JSDoc comments for functions and classes

### WhatsApp Bot Specific
- Keep messages concise for mobile viewing
- Include emojis for better UX (🎬 🎟️ 📱)
- Maintain proper WhatsApp sharing links
- Format output for mobile screens

### Testing Frameworks

**BOTTY (RECO Restaurant Bot Testing):**
- All test results are saved as JSON files with timestamps
- Each persona generates 15 questions dynamically
- Responses are analyzed by OpenAI for quality, relevance, and accuracy
- Final report includes metrics, scores, and improvement recommendations

**PALOMA TESTER (Cinépolis Cinema Bot Testing):**
- Tests 5 Mexican personas with cinema-specific scenarios
- Validates QR code promotions match user demographics
- Analyzes cultural appropriateness and Mexican language usage
- Evaluates dulcería vs taquilla promotion targeting
- Reports on promotional effectiveness and user journey

### Security Considerations
- Never expose API keys in code
- Use environment variables for sensitive data
- Validate user input and API responses
- Handle WhatsApp session data securely

## Key Dependencies

- `@whiskeysockets/baileys` - WhatsApp Web API integration
- `openai` - AI conversation and analysis
- `puppeteer` + `@mendable/firecrawl-js` - Web scraping
- `p-queue` - Message queue management
- `node-cron` - Scheduled tasks
- `lowdb` - JSON database for simple data storage

## Troubleshooting

### Common Issues
- QR code not showing: Clear session with `rm -rf store_wa-session/`
- OpenAI API errors: Verify API key and check rate limits
- No responses from target bot: Confirm bot number and online status
- Connection issues: Check internet connection and WhatsApp Web status

### Debug Mode
```bash
DEBUG=* npm run test-reco
```

## Testing Personas

**BOTTY uses 5 distinct personas for restaurant testing:**
1. **María Fitness** - Health-conscious user (Spanish)
2. **Carlos Estudiante** - Budget-conscious user (Spanish)
3. **Ana Familia** - Family with kids (Spanish)
4. **James Tourist** - UK tourist (English)
5. **Diego Gourmet** - Foodie/adventurous eater (Spanish)

**PALOMA TESTER uses 5 Mexican personas for cinema testing:**
1. **Luis Estudiante** - Young university student, budget-conscious (22, CDMX)
2. **María Familia** - Mother with family, group discounts (38, Estado de México)  
3. **Andrea Romántica** - Young professional, premium experiences (28, Guadalajara)
4. **Roberto Clásico** - Senior retiree, traditional values (65, Puebla)
5. **David Cinéfilo** - Cinema enthusiast, quality-focused (35, Monterrey)

Each persona sends 15 contextual questions and receives AI-powered analysis of responses, with PALOMA TESTER additionally validating QR code appropriateness.