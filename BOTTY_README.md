# 🤖 BOTTY - WhatsApp Bot Tester for RECO

BOTTY is an automated testing system that evaluates the RECO food recommendation chatbot using 5 different user personas and 75 comprehensive questions.

## 🎯 What BOTTY Does

- **Tests 5 User Personas**: Health-conscious, Budget-conscious, Family with kids, UK Tourist, and Foodie/Adventurous
- **Sends 75 Questions**: 15 questions per persona covering various scenarios
- **AI-Powered Analysis**: Uses OpenAI to analyze response quality, relevance, and accuracy
- **Comprehensive Reporting**: Generates detailed feedback with scores and recommendations
- **Automated Workflow**: Runs completely automatically from start to finish

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **WhatsApp Account** (for connecting to WhatsApp Web)
3. **OpenAI API Key** (for response analysis)
4. **RECO Bot Access** (target WhatsApp number: +593 99 417 0801)

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file with your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
RECO_WHATSAPP_NUMBER=+593994170801
TEST_TIMEOUT_MS=30000
LOG_LEVEL=info
ANALYSIS_MODEL=gpt-4.1
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Test Connection (Recommended First)

Test the WhatsApp connection before running the full test:

```bash
npm run test-connection
```

This will verify your WhatsApp connection works properly and send a test message.

### 4. Run BOTTY

```bash
npm run test-reco
# or
node botty.js
```

### 5. Scan QR Code

When BOTTY starts, scan the QR code with your WhatsApp to connect.

## 📊 Test Personas

### 1. 👩‍💪 María Fitness (Health-Conscious User)
- **Language**: Spanish
- **Focus**: Vegan options, healthy restaurants, dietary restrictions
- **Questions**: 15 health-focused inquiries about Madrid restaurants

### 2. 🎓 Carlos Estudiante (Budget-Conscious User)
- **Language**: Spanish  
- **Focus**: Cheap eats, student discounts, budget-friendly options
- **Questions**: 15 price-focused queries about affordable dining

### 3. 👨‍👩‍👧‍👦 Ana Familia (Family with Kids)
- **Language**: Spanish
- **Focus**: Family-friendly restaurants, kids menus, child facilities
- **Questions**: 15 family-oriented restaurant inquiries

### 4. 🇬🇧 James Tourist (UK Tourist)
- **Language**: English
- **Focus**: Authentic Spanish food, tourist attractions, English menus
- **Questions**: 15 tourist-focused questions about Madrid dining

### 5. 🍷 Diego Gourmet (Foodie/Adventurous Eater)
- **Language**: Spanish
- **Focus**: Molecular gastronomy, gourmet experiences, unique dining
- **Questions**: 15 sophisticated culinary inquiries

## 🔄 Testing Flow

```
1. Initialize → Connect to WhatsApp
2. Execute → Send all 75 questions sequentially  
3. Collect → Gather responses from RECO bot
4. Analyze → AI analysis of each response
5. Generate → Create comprehensive report
6. Send → Deliver "Mensaje final" to RECO
7. Save → Store complete results in test-logs/
```

## 📈 Analysis Metrics

BOTTY evaluates responses on:

- **Recommendation Accuracy**: Does it provide relevant restaurant suggestions?
- **Language Quality**: Correct language usage and tone
- **Response Completeness**: Does it answer the question fully?
- **Keyword Relevance**: Contains expected terms for the query type
- **Edge Case Handling**: Manages ambiguous or special requests

## 📁 Output Files

All results are saved in `test-logs/` directory:

- `health_conscious_[timestamp].json` - María Fitness results
- `budget_conscious_[timestamp].json` - Carlos Estudiante results  
- `family_kids_[timestamp].json` - Ana Familia results
- `uk_tourist_[timestamp].json` - James Tourist results
- `foodie_adventurous_[timestamp].json` - Diego Gourmet results
- `full_test_[timestamp].json` - Complete test session

## 📊 Final Report Format

The final report sent to RECO includes:

```
MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT

📈 MÉTRICAS GENERALES:
- Total de preguntas: 75
- Respuestas recibidas: X/75
- Tiempo promedio de respuesta: X segundos
- Tasa de éxito: X%

🎯 PRECISIÓN DE RECOMENDACIONES (por persona):
1. María Fitness: X/5 ⭐⭐⭐⭐⭐
2. Carlos Estudiante: X/5 ⭐⭐⭐⭐☆
[... etc]

🗣️ CALIDAD DE LENGUAJE:
- Consistencia en español: X%
- Consistencia en inglés: X%

⚠️ MANEJO DE CASOS LÍMITE:
[Analysis of edge cases]

🔄 FLUJO DE EXPERIENCIA:
[User experience evaluation]

💡 RECOMENDACIONES:
[Specific improvement suggestions]

📊 RESUMEN EJECUTIVO:
[Overall grade and performance summary]
```

## ⚙️ Configuration Options

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `RECO_WHATSAPP_NUMBER`: Target bot number (default: +593994170801)
- `TEST_TIMEOUT_MS`: Response timeout in milliseconds (default: 30000)
- `LOG_LEVEL`: Logging verbosity (default: info)
- `ANALYSIS_MODEL`: OpenAI model for analysis (default: gpt-4.1)

### Command Line Options

```bash
# Test WhatsApp connection first (recommended)
npm run test-connection

# Standard test
npm run test-reco

# Development mode (more verbose logging)
npm run test-reco-dev

# Clear WhatsApp session (if having connection issues)
npm run clear-session

# Start BOTTY only
npm run start-botty
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Run `npm run test-connection` first to verify connection
   - Clear session: `npm run clear-session` and try again
   - Ensure WhatsApp Web is not open elsewhere
   - Check for stable internet connection

2. **QR Code Not Showing**
   - Ensure terminal supports QR code display
   - Try clearing WhatsApp session: `npm run clear-session`

3. **Chat Sync Errors (regular_low sync failures)**
   - This is common with accounts that have lots of chat history
   - Clear session: `npm run clear-session`
   - The connection should still work despite these errors

4. **OpenAI API Errors**
   - Verify API key is correct in `.env`
   - Check API rate limits and billing

5. **No Responses from RECO**
   - Confirm RECO bot number is correct in `.env`
   - Check if RECO bot is online and responding
   - Test with `npm run test-connection` first

6. **Connection Issues**
   - Ensure stable internet connection
   - Make sure WhatsApp Web is not open elsewhere
   - Try `npm run clear-session` to start fresh

### Debug Mode

For detailed logging, set environment variable:
```bash
DEBUG=* npm run test-reco
```

## 📝 Logs and Monitoring

BOTTY provides real-time logging:

```
🚀 [14:30:15] Starting BOTTY test session: test_1234567890
👤 [14:30:20] Starting persona: María Fitness (es)
📤 [14:30:25] Q1/15: Hola, busco restaurantes con opciones veganas...
📥 [14:30:28] Response ✅ (3.2s)
```

## 🎯 Success Metrics

- **Completion Rate**: Target 100% questions sent
- **Response Rate**: Target 90%+ responses received  
- **Analysis Accuracy**: Target 95% responses analyzed
- **Performance**: Target <30 minutes total runtime

## 🛡️ Safety Features

- **Rate Limiting**: Prevents overwhelming target bot
- **Error Recovery**: Graceful handling of failures
- **Session Management**: Automatic WhatsApp session handling
- **Data Privacy**: Secure handling of conversation data

## 🤝 Contributing

To extend BOTTY:

1. Add new personas in `src/test-personas.js`
2. Modify analysis criteria in `src/response-analyzer.js`
3. Update report format in `src/feedback-generator.js`

## 📞 Support

For issues or questions about BOTTY:

1. Check the logs in `test-logs/` directory
2. Review console output for error messages
3. Verify environment configuration
4. Ensure all dependencies are installed

---

**BOTTY v1.0** - Automated WhatsApp Bot Testing System
Built for comprehensive evaluation of RECO food recommendation chatbot 🤖🍽️ 