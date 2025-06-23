# 🎬 PALOMA TESTER - WhatsApp Bot Tester for Cinépolis

PALOMA TESTER is an automated testing system that evaluates the Cinépolis movie theater bot "Paloma" using 5 different Mexican user personas and 75 comprehensive questions focused on cinema promotions, QR codes, and user experience.

## 🎯 What PALOMA TESTER Does

- **Tests 5 Mexican Personas**: Different demographics targeting Cinépolis customers
- **Sends 75 Questions**: 15 questions per persona covering various cinema scenarios
- **AI-Powered Analysis**: Uses OpenAI to analyze response quality, promotion targeting, and cultural appropriateness
- **QR Code Validation**: Validates that correct promotional QR codes are sent based on user profile
- **Comprehensive Reporting**: Generates detailed feedback with scores and improvement recommendations
- **Automated Workflow**: Runs completely automatically from start to finish

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **WhatsApp Account** (for connecting to WhatsApp Web)
3. **OpenAI API Key** (for response analysis)
4. **Paloma Bot Access** (target WhatsApp number for Cinépolis bot)

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file with your configuration:

```env
OPENAI_API_KEY=your_openai_api_key_here
PALOMA_WHATSAPP_NUMBER=34624330565@s.whatsapp.net
TEST_TIMEOUT_MS=30000
LOG_LEVEL=info
ANALYSIS_MODEL=gpt-4o
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Run PALOMA TESTER

```bash
npm run test-paloma
# or
node paloma-tester.js
```

### 4. Scan QR Code

When PALOMA TESTER starts, scan the QR code with your WhatsApp to connect.

## 👥 Test Personas

### 1. 🎓 Luis Estudiante (Young University Student)
- **Age**: 22 years old
- **Location**: CDMX
- **Budget**: Low
- **Group Size**: 1-2 people (couple)
- **Focus**: Student discounts, cheap promotions, budget-friendly options
- **Language**: Casual Mexican slang ("órale", "está chido")

### 2. 👨‍👩‍👧‍👦 María Familia (Family Mother)
- **Age**: 38 years old
- **Location**: Estado de México
- **Budget**: Medium
- **Group Size**: 4-6 people (family)
- **Focus**: Family packages, kids' promotions, group discounts
- **Language**: Formal but warm Mexican traditional

### 3. 💕 Andrea Romántica (Young Professional Woman)
- **Age**: 28 years old
- **Location**: Guadalajara
- **Budget**: Medium-High
- **Group Size**: 2 people (couple)
- **Focus**: Premium experiences, romantic packages, VIP options
- **Language**: Modern urban Mexican

### 4. 👴 Roberto Clásico (Senior Retiree)
- **Age**: 65 years old
- **Location**: Puebla
- **Budget**: Medium
- **Group Size**: 2-3 people (senior couple/friends)
- **Focus**: Senior discounts, matinee shows, traditional experiences
- **Language**: Very formal traditional Mexican

### 5. 🎭 David Cinéfilo (Cinema Enthusiast Professional)
- **Age**: 35 years old
- **Location**: Monterrey
- **Budget**: High
- **Group Size**: Flexible (1-4 people)
- **Focus**: Premium experiences, IMAX, exclusive screenings
- **Language**: Cultured but accessible

## 🔄 Testing Flow

```
1. Initialize → Connect to WhatsApp
2. Execute → Send all 75 questions sequentially across 5 personas
3. Collect → Gather responses and QR codes from Paloma bot
4. Analyze → AI analysis of each response and QR appropriateness
5. Generate → Create comprehensive report
6. Send → Deliver "Mensaje final" to Paloma
7. Save → Store complete results in test-logs/
```

## 📈 Analysis Metrics

PALOMA TESTER evaluates responses on:

- **Relevancia**: Does it provide relevant responses to the user's query?
- **Personalización**: Does it consider the user's demographic profile?
- **Información Promocional**: Does it provide clear promotional information?
- **Claridad del Lenguaje**: Is the language clear and appropriate for Mexican users?
- **Call to Action**: Does it effectively guide users to next steps?
- **Empatía Cultural**: Does it demonstrate understanding of Mexican culture?

## 🎁 QR Code Validation

The system validates that:
- QR codes match user budget levels (low/medium/high)
- Promotions are appropriate for group size
- Dulcería vs Taquilla preferences are respected
- Timing of QR delivery is appropriate

## 📁 Output Files

All results are saved in `test-logs/` directory:

- `luis_estudiante_[timestamp].json` - Student persona results
- `maria_familia_[timestamp].json` - Family persona results  
- `andrea_romantica_[timestamp].json` - Romantic persona results
- `roberto_clasico_[timestamp].json` - Senior persona results
- `david_cinefilo_[timestamp].json` - Cinema enthusiast results
- `full_paloma_test_[timestamp].json` - Complete test session

## 📊 Final Report Format

The final report sent to Paloma includes:

```
🎬 REPORTE FINAL - EVALUACIÓN BOT PALOMA CINÉPOLIS

📊 MÉTRICAS GENERALES:
- Total de preguntas: 75
- Respuestas recibidas: X/75
- Códigos QR enviados: X
- Tiempo promedio de respuesta: X segundos
- Tasa de conversión: X%

🎯 CALIFICACIÓN POR PERSONA:
1. Luis Estudiante: X/5 ⭐⭐⭐⭐⭐
2. María Familia: X/5 ⭐⭐⭐⭐☆
[... etc]

🎁 EFECTIVIDAD DE PROMOCIONES:
- QR apropiados para perfil: X%
- Targeting demográfico: X%
- Conversión dulcería/taquilla: X%

🇲🇽 APROPIACIÓN CULTURAL:
- Lenguaje mexicano: X%
- Expresiones regionales: X%
- Tono apropiado por edad: X%

⚠️ ÁREAS DE MEJORA:
[Análisis de casos problemáticos]

💡 RECOMENDACIONES:
[Sugerencias específicas de mejora]

📊 RESUMEN EJECUTIVO:
[Calificación general y conclusiones]
```

## ⚙️ Configuration Options

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PALOMA_WHATSAPP_NUMBER`: Target bot number (required)
- `TEST_TIMEOUT_MS`: Response timeout in milliseconds (default: 30000)
- `LOG_LEVEL`: Logging verbosity (default: info)
- `ANALYSIS_MODEL`: OpenAI model for analysis (default: gpt-4o)

### Command Line Options

```bash
# Standard test
npm run test-paloma

# Development mode (more verbose logging)
npm run test-paloma-dev

# Direct execution
node paloma-tester.js
```

## 🔧 Troubleshooting

### Common Issues

1. **QR Code Not Showing**
   - Ensure terminal supports QR code display
   - Try clearing WhatsApp session: `rm -rf store_wa-session-paloma-tester/`

2. **OpenAI API Errors**
   - Verify API key is correct in `.env`
   - Check API rate limits and billing

3. **No Responses from Paloma**
   - Confirm Paloma bot number is correct
   - Check if Paloma bot is online and responding

4. **Connection Issues**
   - Ensure stable internet connection
   - Check WhatsApp Web status

### Debug Mode

For detailed logging, set environment variable:
```bash
DEBUG=* npm run test-paloma
```

## 📝 Logs and Monitoring

PALOMA TESTER provides real-time logging:

```
🎬 [14:30:15] Starting PALOMA TESTER session: paloma_test_1234567890
👤 [14:30:20] Starting persona: Luis Estudiante (es)
📤 [14:30:25] Q1/15: ¡Órale! ¿Qué onda? Quiero ir al cine...
📥 [14:30:28] Response ✅ (3.2s)
🎁 [14:30:30] QR Received: Mac & Cheese Boneless
```

## 🎯 Success Metrics

- **Completion Rate**: Target 100% questions sent
- **Response Rate**: Target 90%+ responses received  
- **QR Rate**: Target 60%+ QR codes received
- **Appropriateness**: Target 80%+ appropriate QRs for persona
- **Performance**: Target <45 minutes total runtime

## 🛡️ Safety Features

- **Rate Limiting**: Prevents overwhelming target bot
- **Error Recovery**: Graceful handling of failures
- **Session Management**: Separate WhatsApp session handling
- **Data Privacy**: Secure handling of conversation data

## 🤝 Contributing

To extend PALOMA TESTER:

1. Add new personas in `src/cinepolis-test-personas.js`
2. Modify analysis criteria in `src/cinepolis-response-analyzer.js`
3. Update report format in `src/cinepolis-feedback-generator.js`
4. Extend QR validation logic for new promotions

## 📞 Support

For issues or questions about PALOMA TESTER:

1. Check the logs in `test-logs/` directory
2. Review console output for error messages
3. Verify environment configuration
4. Ensure all dependencies are installed

---

**PALOMA TESTER v1.0** - Automated WhatsApp Bot Testing System
Built for comprehensive evaluation of Cinépolis promotional chatbot 🎬🍿