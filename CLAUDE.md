# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is BOTTY - an automated WhatsApp bot testing system that evaluates the RECO food recommendation chatbot using 5 AI-powered personas. The system sends 75 questions across different user personas and provides comprehensive analysis of responses.

### Architecture

The project consists of two main bots:
- **Main Bot** (`index.js`): Original Cinépolis movie theater WhatsApp bot with QR promotions
- **BOTTY Tester** (`botty.js`): Automated testing system for evaluating chatbots

Key architectural components:
- **Test Orchestrator** (`src/test-orchestrator.js`): Manages test execution flow across personas
- **AI Conversation Generator** (`src/ai-conversation-generator.js`): Generates dynamic questions using OpenAI
- **Response Analyzer** (`src/response-analyzer.js`): Analyzes bot responses for quality and accuracy
- **Test Personas** (`src/test-personas.js`): Defines 5 different user personas with unique characteristics
- **Feedback Generator** (`src/feedback-generator.js`): Creates comprehensive test reports
- **Test Logger** (`src/test-logger.js`): Handles logging and result storage

## Development Commands

### Primary Testing Commands
- `npm run test-reco` or `npm run start-botty`: Run BOTTY automated testing system
- `npm run test-reco-dev`: Run BOTTY with development mode (verbose logging)
- `npm run test-connection`: Test WhatsApp connection before full testing
- `npm run test-response-wait`: Test response timing functionality

### Session Management
- `npm run clear-session`: Clear WhatsApp session data (useful for connection issues)

### Main Bot Commands
- `npm start` or `node index.js`: Run the main Cinépolis bot
- `npm run analyze-logs`: Analyze test result logs

## Environment Configuration

Required environment variables in `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
RECO_WHATSAPP_NUMBER=+593994170801
TEST_TIMEOUT_MS=30000
LOG_LEVEL=info
ANALYSIS_MODEL=gpt-4.1
```

## Testing Framework

The system uses 5 AI personas for comprehensive testing:
1. **María Fitness** (health_conscious): Health-focused Spanish speaker
2. **Carlos Estudiante** (budget_conscious): Budget-conscious Spanish student  
3. **Ana Familia** (family_kids): Spanish mother with children
4. **James British** (international_tourist): English-speaking tourist
5. **Diego Gourmet** (foodie_adventurous): Sophisticated Spanish foodie

Each persona generates 15 dynamic questions using OpenAI, resulting in 75 total test questions.

## Key Technical Details

### WhatsApp Integration
- Uses `@whiskeysockets/baileys` for WhatsApp Web API
- Session data stored in `store_wa-session/` directory
- Supports QR code authentication
- Handles connection recovery and error states

### Message Processing
- Uses `p-queue` for sequential message processing
- Implements typing delays and natural conversation flow
- Tracks response times and conversation state

### AI Analysis
- OpenAI integration for response quality analysis
- Comprehensive scoring across multiple metrics
- Generates detailed feedback reports with recommendations

### Data Storage
- Test results saved in `test-logs/` directory with timestamps
- JSON format for easy analysis and parsing
- Separate files for each persona and full test results

## Code Style Guidelines

Based on `.cursorrules`:
- Use 2-space indentation
- Include emojis for better readability (🎬 🎟️ 📱)
- Add JSDoc comments for functions and classes
- Use async/await for asynchronous operations
- Handle API errors gracefully
- Keep messages concise and mobile-friendly
- Maintain proper WhatsApp formatting

## Troubleshooting

Common issues and solutions:
- **Connection timeouts**: Run `npm run test-connection` first, then `npm run clear-session` if needed
- **QR code not showing**: Clear session data and restart
- **Chat sync errors**: Common with accounts having lots of history, usually still works
- **No responses from target**: Verify target bot number and online status