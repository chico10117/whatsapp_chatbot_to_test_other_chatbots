# 🤖 BOTTY Implementation Plan - Detailed Technical Specification

## 📋 Current Repository Analysis

### **Existing Structure**
```
whatsapp_chatbot_to_test_other_chatbots/
├── index.js                 # Main WhatsApp bot (331 lines)
├── prompt.js                # PromptBuilder class (269 lines)
├── cinepolis-fetcher.js     # Data fetching logic (244 lines)
├── promotions.js            # QR promotions structure (27 lines)
├── package.json             # Dependencies configuration
├── .env                     # Environment variables
├── qr/                      # QR code images directory
├── store_wa-session/        # WhatsApp session storage
└── test-logs/               # Will be created for test results
```

### **Current Dependencies (Reusable)**
- `@whiskeysockets/baileys`: WhatsApp Web API ✅
- `openai`: For response analysis ✅
- `p-queue`: Message queue management ✅
- `dotenv`: Environment configuration ✅
- `node-fetch`: HTTP requests ✅
- `fs/promises`: File operations ✅

## 🏗️ Implementation Strategy

### **Phase 1: Core Architecture Transformation**

#### **1.1 Main Entry Point Refactoring**
**File: `botty.js` (New - Based on `index.js`)**

```javascript
import dotenv from 'dotenv';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import TestOrchestrator from './src/test-orchestrator.js';
import TestPersonas from './src/test-personas.js';
import ResponseAnalyzer from './src/response-analyzer.js';
import FeedbackGenerator from './src/feedback-generator.js';

dotenv.config();

class BottyTester {
  constructor() {
    this.recoNumber = (process.env.RECO_WHATSAPP_NUMBER || '+593994170801').replace('+', '') + '@s.whatsapp.net';
    this.globalClient = null;
    this.testOrchestrator = new TestOrchestrator();
    this.responseAnalyzer = new ResponseAnalyzer();
    this.feedbackGenerator = new FeedbackGenerator();
    this.testStartTime = null;
    this.testResults = [];
  }

  async initialize() {
    // Initialize WhatsApp connection (reuse from index.js)
    // Set up event handlers for testing
    // Prepare test environment
  }

  async startTesting() {
    // Main testing flow
    // Execute all personas sequentially
    // Generate final report
  }
}
```

#### **1.2 Directory Structure Creation**
```
src/
├── test-orchestrator.js     # Main testing logic
├── test-personas.js         # Persona definitions and questions
├── response-analyzer.js     # Response analysis engine
├── feedback-generator.js    # Final report generator
├── test-logger.js          # Logging utilities
└── utils/
    ├── message-handler.js   # Message processing utilities
    ├── timing-utils.js      # Response time calculations
    └── validation-utils.js  # Response validation
```

### **Phase 2: Persona Implementation**

#### **2.1 Test Personas Structure**
**File: `src/test-personas.js`**

```javascript
export const TEST_PERSONAS = {
  health_conscious: {
    id: 'health_conscious',
    name: 'María Fitness',
    language: 'es',
    description: 'Usuario consciente de la salud',
    questions: [
      "Hola, busco restaurantes con opciones veganas en el centro de Madrid",
      "¿Qué lugares tienen ensaladas frescas cerca de Sol?",
      // ... 13 more questions
    ],
    expectedKeywords: ['vegano', 'saludable', 'ensalada', 'orgánico', 'sin gluten'],
    evaluationCriteria: {
      healthFocus: true,
      locationAwareness: true,
      dietaryRestrictions: true
    }
  },
  budget_conscious: {
    id: 'budget_conscious',
    name: 'Carlos Estudiante',
    language: 'es',
    description: 'Usuario consciente del presupuesto',
    questions: [
      "Busco menús del día por menos de 12 euros",
      "¿Dónde está el kebab más barato de Madrid?",
      // ... 13 more questions
    ],
    expectedKeywords: ['barato', 'económico', 'descuento', 'oferta', 'menú del día'],
    evaluationCriteria: {
      priceAwareness: true,
      budgetOptions: true,
      studentDiscounts: true
    }
  },
  family_kids: {
    id: 'family_kids',
    name: 'Ana Familia',
    language: 'es',
    description: 'Familia con niños',
    questions: [
      "Busco restaurantes con zona de juegos para niños",
      "¿Qué sitios tienen menú infantil en Pozuelo?",
      // ... 13 more questions
    ],
    expectedKeywords: ['niños', 'familia', 'menú infantil', 'juegos', 'terraza'],
    evaluationCriteria: {
      familyFriendly: true,
      childrenFacilities: true,
      safeEnvironment: true
    }
  },
  uk_tourist: {
    id: 'uk_tourist',
    name: 'James Tourist',
    language: 'en',
    description: 'Tourist from UK',
    questions: [
      "Hi, where can I find authentic Spanish tapas near Plaza Mayor?",
      "What's the best paella restaurant in Madrid?",
      // ... 13 more questions
    ],
    expectedKeywords: ['tapas', 'paella', 'authentic', 'tourist', 'english menu'],
    evaluationCriteria: {
      touristFriendly: true,
      englishSupport: true,
      culturalExperience: true
    }
  },
  foodie_adventurous: {
    id: 'foodie_adventurous',
    name: 'Diego Gourmet',
    language: 'es',
    description: 'Foodie/Aventurero gastronómico',
    questions: [
      "Busco restaurantes de cocina molecular en Madrid",
      "¿Dónde puedo probar insectos comestibles?",
      // ... 13 more questions
    ],
    expectedKeywords: ['molecular', 'gourmet', 'michelin', 'degustación', 'chef'],
    evaluationCriteria: {
      sophisticatedTaste: true,
      uniqueExperiences: true,
      highEndDining: true
    }
  }
};
```

### **Phase 3: Testing Engine Implementation**

#### **3.1 Test Orchestrator**
**File: `src/test-orchestrator.js`**

```javascript
import { TEST_PERSONAS } from './test-personas.js';
import TestLogger from './test-logger.js';
import { delay } from '@whiskeysockets/baileys';

export default class TestOrchestrator {
  constructor() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.logger = new TestLogger();
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
  }

  async executeAllPersonas(whatsappClient, recoNumber) {
    console.log('🚀 Starting BOTTY testing sequence...');
    
    for (const [personaId, persona] of Object.entries(TEST_PERSONAS)) {
      console.log(`\n👤 Testing persona: ${persona.name} (${personaId})`);
      await this.executePersona(whatsappClient, recoNumber, persona);
      
      // Wait between personas to avoid overwhelming Reco
      await delay(5000);
    }
    
    console.log('✅ All personas tested successfully');
    return this.testResults;
  }

  async executePersona(whatsappClient, recoNumber, persona) {
    this.currentPersona = persona;
    this.currentQuestionIndex = 0;
    
    const personaResults = {
      personaId: persona.id,
      personaName: persona.name,
      language: persona.language,
      startTime: new Date(),
      questions: [],
      summary: {}
    };

    for (let i = 0; i < persona.questions.length; i++) {
      const question = persona.questions[i];
      console.log(`  📝 Question ${i + 1}/15: ${question.substring(0, 50)}...`);
      
      const questionResult = await this.sendQuestionAndWaitResponse(
        whatsappClient, 
        recoNumber, 
        question, 
        i + 1
      );
      
      personaResults.questions.push(questionResult);
      
      // Wait for response before sending next question
      await delay(2000);
    }
    
    personaResults.endTime = new Date();
    personaResults.duration = personaResults.endTime - personaResults.startTime;
    
    this.testResults.push(personaResults);
    await this.logger.savePersonaResults(personaResults);
    
    return personaResults;
  }

  async sendQuestionAndWaitResponse(whatsappClient, recoNumber, question, questionNumber) {
    const sentTime = new Date();
    
    // Send question to Reco
    await whatsappClient.sendMessage(recoNumber, { text: question });
    
    // Set up response waiting mechanism
    this.isWaitingForResponse = true;
    this.lastMessageTime = sentTime;
    
    const questionResult = {
      questionNumber,
      question,
      sentAt: sentTime,
      response: null,
      receivedAt: null,
      responseTime: null,
      analysis: {}
    };
    
    // Wait for response (with timeout)
    const response = await this.waitForResponse(30000); // 30 second timeout
    
    if (response) {
      questionResult.response = response.text;
      questionResult.receivedAt = response.timestamp;
      questionResult.responseTime = response.timestamp - sentTime;
    }
    
    this.isWaitingForResponse = false;
    return questionResult;
  }

  async waitForResponse(timeoutMs) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null); // No response received
      }, timeoutMs);
      
      // This will be called by the message handler when response is received
      this.responseCallback = (response) => {
        clearTimeout(timeout);
        resolve(response);
      };
    });
  }

  handleIncomingMessage(message) {
    if (this.isWaitingForResponse && this.responseCallback) {
      const response = {
        text: message.text || message.conversation || '',
        timestamp: new Date(),
        messageType: message.type || 'text'
      };
      
      this.responseCallback(response);
    }
  }
}
```

#### **3.2 Response Analysis Engine**
**File: `src/response-analyzer.js`**

```javascript
import OpenAI from 'openai';

export default class ResponseAnalyzer {
  constructor() {
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://gateway.ai.cloudflare.com/v1/9536a9ec53cf05783eefb6f6d1c06292/reco-test/openai"
    });
  }

  async analyzeResponse(question, response, persona, expectedKeywords) {
    if (!response || response.trim() === '') {
      return {
        hasRecommendation: false,
        languageCorrect: false,
        relevanceScore: 0,
        containsExpectedKeywords: false,
        responseQuality: 'no_response',
        errors: ['No response received']
      };
    }

    try {
      const analysisPrompt = `
        Analiza esta respuesta de un chatbot de recomendaciones de restaurantes:
        
        PREGUNTA: "${question}"
        RESPUESTA: "${response}"
        IDIOMA ESPERADO: ${persona.language === 'es' ? 'Español' : 'English'}
        PALABRAS CLAVE ESPERADAS: ${expectedKeywords.join(', ')}
        
        Evalúa y responde en JSON:
        {
          "hasRecommendation": boolean,
          "languageCorrect": boolean,
          "relevanceScore": number (1-5),
          "containsExpectedKeywords": boolean,
          "responseQuality": "excellent|good|fair|poor|no_response",
          "recommendationCount": number,
          "errors": ["error1", "error2"],
          "strengths": ["strength1", "strength2"],
          "suggestions": ["suggestion1", "suggestion2"]
        }
      `;

      const gptResponse = await this.openaiClient.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: "system", content: "Eres un experto evaluador de chatbots de restaurantes. Analiza objetivamente las respuestas." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(gptResponse.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing response:', error);
      return {
        hasRecommendation: false,
        languageCorrect: false,
        relevanceScore: 0,
        containsExpectedKeywords: false,
        responseQuality: 'analysis_error',
        errors: ['Analysis failed: ' + error.message]
      };
    }
  }

  calculatePersonaScore(personaResults) {
    const questions = personaResults.questions;
    const totalQuestions = questions.length;
    
    if (totalQuestions === 0) return 0;

    let totalScore = 0;
    let responsesReceived = 0;
    let recommendationsProvided = 0;
    let languageConsistency = 0;

    questions.forEach(q => {
      if (q.analysis) {
        if (q.response) responsesReceived++;
        if (q.analysis.hasRecommendation) recommendationsProvided++;
        if (q.analysis.languageCorrect) languageConsistency++;
        totalScore += q.analysis.relevanceScore || 0;
      }
    });

    return {
      overallScore: totalScore / totalQuestions,
      responseRate: (responsesReceived / totalQuestions) * 100,
      recommendationRate: (recommendationsProvided / totalQuestions) * 100,
      languageConsistency: (languageConsistency / totalQuestions) * 100,
      averageRelevance: totalScore / totalQuestions
    };
  }
}
```

### **Phase 4: Logging and Reporting**

#### **4.1 Test Logger**
**File: `src/test-logger.js`**

```javascript
import fs from 'fs/promises';
import path from 'path';

export default class TestLogger {
  constructor() {
    this.logsDir = './test-logs';
    this.ensureLogsDirectory();
  }

  async ensureLogsDirectory() {
    try {
      await fs.access(this.logsDir);
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true });
    }
  }

  async savePersonaResults(personaResults) {
    const filename = `${personaResults.personaId}_${Date.now()}.json`;
    const filepath = path.join(this.logsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(personaResults, null, 2));
    console.log(`📁 Saved results for ${personaResults.personaName} to ${filename}`);
  }

  async saveFullTestResults(allResults) {
    const filename = `full_test_${Date.now()}.json`;
    const filepath = path.join(this.logsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(allResults, null, 2));
    console.log(`📁 Saved complete test results to ${filename}`);
  }

  async loadTestResults(filename) {
    const filepath = path.join(this.logsDir, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  }
}
```

#### **4.2 Feedback Generator**
**File: `src/feedback-generator.js`**

```javascript
export default class FeedbackGenerator {
  constructor() {
    this.reportTemplate = {
      title: "MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT",
      sections: ['metrics', 'recommendations', 'language', 'edgeCases', 'experience', 'suggestions']
    };
  }

  generateFinalReport(allTestResults, analysisResults) {
    const totalQuestions = allTestResults.reduce((sum, persona) => sum + persona.questions.length, 0);
    const totalResponses = allTestResults.reduce((sum, persona) => 
      sum + persona.questions.filter(q => q.response).length, 0);
    
    const avgResponseTime = this.calculateAverageResponseTime(allTestResults);
    const successRate = (totalResponses / totalQuestions) * 100;

    const report = `
MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT

📈 MÉTRICAS GENERALES:
- Total de preguntas: ${totalQuestions}
- Respuestas recibidas: ${totalResponses}/${totalQuestions}
- Tiempo promedio de respuesta: ${avgResponseTime.toFixed(2)} segundos
- Tasa de éxito: ${successRate.toFixed(1)}%

🎯 PRECISIÓN DE RECOMENDACIONES (por persona):
${this.generatePersonaScores(allTestResults, analysisResults)}

🗣️ CALIDAD DE LENGUAJE:
${this.generateLanguageAnalysis(allTestResults, analysisResults)}

⚠️ MANEJO DE CASOS LÍMITE:
${this.generateEdgeCaseAnalysis(allTestResults)}

🔄 FLUJO DE EXPERIENCIA:
${this.generateExperienceAnalysis(analysisResults)}

💡 RECOMENDACIONES:
${this.generateSuggestions(analysisResults)}
    `.trim();

    return report;
  }

  generatePersonaScores(allTestResults, analysisResults) {
    return allTestResults.map((persona, index) => {
      const score = analysisResults[persona.personaId];
      const stars = '⭐'.repeat(Math.round(score.overallScore));
      return `${index + 1}. ${persona.personaName}: ${score.overallScore.toFixed(1)}/5 ${stars}`;
    }).join('\n');
  }

  generateLanguageAnalysis(allTestResults, analysisResults) {
    const spanishPersonas = allTestResults.filter(p => p.language === 'es');
    const englishPersonas = allTestResults.filter(p => p.language === 'en');
    
    const spanishConsistency = spanishPersonas.length > 0 ? 
      spanishPersonas.reduce((sum, p) => sum + analysisResults[p.personaId].languageConsistency, 0) / spanishPersonas.length : 0;
    
    const englishConsistency = englishPersonas.length > 0 ? 
      englishPersonas.reduce((sum, p) => sum + analysisResults[p.personaId].languageConsistency, 0) / englishPersonas.length : 0;

    return `- Consistencia en español: ${spanishConsistency.toFixed(1)}%
- Consistencia en inglés: ${englishConsistency.toFixed(1)}%
- Errores gramaticales detectados: ${this.countGrammarErrors(allTestResults)}
- Tono apropiado: ${this.evaluateTone(allTestResults)}`;
  }

  generateEdgeCaseAnalysis(allTestResults) {
    // Analyze how well the bot handled ambiguous or challenging questions
    const ambiguousQuestions = this.identifyAmbiguousQuestions(allTestResults);
    const unrelatedQuestions = this.identifyUnrelatedQuestions(allTestResults);
    
    return `- Preguntas ambiguas: ${ambiguousQuestions.handled}/${ambiguousQuestions.total} manejadas
- Solicitudes no relacionadas: ${unrelatedQuestions.handled}/${unrelatedQuestions.total} rechazadas
- Errores recuperados: ${this.countRecoveredErrors(allTestResults)}`;
  }

  generateExperienceAnalysis(analysisResults) {
    const avgClarity = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / Object.keys(analysisResults).length;
    
    return `- Claridad en respuestas: ${avgClarity.toFixed(1)}/5
- Facilidad de uso: ${this.evaluateEaseOfUse(analysisResults)}/5
- Información completa: ${this.evaluateCompleteness(analysisResults)}/5
- Sugerencias adicionales: ${this.evaluateAdditionalSuggestions(analysisResults)}/5`;
  }

  generateSuggestions(analysisResults) {
    const suggestions = [];
    
    // Analyze common issues and generate suggestions
    const avgScore = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / Object.keys(analysisResults).length;
    
    if (avgScore < 3) {
      suggestions.push("- Mejorar la precisión de las recomendaciones");
    }
    
    if (this.hasLanguageIssues(analysisResults)) {
      suggestions.push("- Revisar la consistencia del idioma en las respuestas");
    }
    
    if (this.hasResponseTimeIssues(analysisResults)) {
      suggestions.push("- Optimizar el tiempo de respuesta del bot");
    }
    
    return suggestions.length > 0 ? suggestions.join('\n') : "- El bot funciona correctamente en general";
  }

  calculateAverageResponseTime(allTestResults) {
    let totalTime = 0;
    let responseCount = 0;
    
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        if (q.responseTime) {
          totalTime += q.responseTime;
          responseCount++;
        }
      });
    });
    
    return responseCount > 0 ? totalTime / responseCount / 1000 : 0; // Convert to seconds
  }

  // Helper methods for analysis
  countGrammarErrors(allTestResults) {
    // Implementation for counting grammar errors
    return 0; // Placeholder
  }

  evaluateTone(allTestResults) {
    // Implementation for evaluating tone appropriateness
    return "✓"; // Placeholder
  }

  identifyAmbiguousQuestions(allTestResults) {
    // Implementation for identifying ambiguous questions
    return { handled: 0, total: 0 }; // Placeholder
  }

  identifyUnrelatedQuestions(allTestResults) {
    // Implementation for identifying unrelated questions
    return { handled: 0, total: 0 }; // Placeholder
  }

  countRecoveredErrors(allTestResults) {
    // Implementation for counting recovered errors
    return 0; // Placeholder
  }

  evaluateEaseOfUse(analysisResults) {
    // Implementation for evaluating ease of use
    return 4; // Placeholder
  }

  evaluateCompleteness(analysisResults) {
    // Implementation for evaluating completeness
    return 4; // Placeholder
  }

  evaluateAdditionalSuggestions(analysisResults) {
    // Implementation for evaluating additional suggestions
    return 3; // Placeholder
  }

  hasLanguageIssues(analysisResults) {
    // Implementation for detecting language issues
    return false; // Placeholder
  }

  hasResponseTimeIssues(analysisResults) {
    // Implementation for detecting response time issues
    return false; // Placeholder
  }
}
```

### **Phase 5: Integration and Configuration**

#### **5.1 Environment Configuration**
**File: `.env` (Updated)**

```env
# Existing variables
OPENAI_API_KEY=your_openai_api_key_here

# New variables for testing
RECO_WHATSAPP_NUMBER=+593994170801
TEST_MODE=true
TEST_TIMEOUT_MS=30000
LOG_LEVEL=info
ANALYSIS_MODEL=gpt-4.1
```

#### **5.2 Package.json Updates**
**File: `package.json` (Updated scripts section)**

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node index.js",
    "start-botty": "node botty.js",
    "test-reco": "node botty.js",
    "analyze-logs": "node scripts/analyze-logs.js"
  }
}
```

### **Phase 6: Testing and Validation**

#### **6.1 Pre-Test Validation**
- Verify WhatsApp connection
- Test message sending to a test number
- Validate persona question sets
- Check OpenAI API connectivity

#### **6.2 Test Execution Flow**
1. **Initialize**: Connect to WhatsApp, load personas
2. **Pre-test**: Send test message to verify connection
3. **Execute**: Run all 5 personas sequentially
4. **Analyze**: Process all responses with OpenAI
5. **Report**: Generate and send final feedback
6. **Cleanup**: Save logs and close connections

#### **6.3 Error Handling**
- Connection failures
- Message sending failures
- Response timeout handling
- Analysis API failures
- Graceful degradation

## 🚀 Implementation Timeline

### **Week 1: Core Infrastructure**
- [ ] Create new file structure
- [ ] Implement BottyTester main class
- [ ] Set up TestOrchestrator
- [ ] Create persona definitions

### **Week 2: Testing Engine**
- [ ] Implement message sending logic
- [ ] Add response waiting mechanism
- [ ] Create response analysis system
- [ ] Build logging infrastructure

### **Week 3: Analysis and Reporting**
- [ ] Integrate OpenAI analysis
- [ ] Build feedback generator
- [ ] Create final report template
- [ ] Add error handling

### **Week 4: Testing and Refinement**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Bug fixes and improvements
- [ ] Documentation completion

## 📊 Success Metrics

- **Completion Rate**: 100% of questions sent successfully
- **Response Analysis**: 95% of responses analyzed correctly
- **Report Quality**: Comprehensive feedback generated
- **Error Handling**: Graceful handling of edge cases
- **Performance**: Average test completion under 30 minutes

## 🔧 Maintenance and Monitoring

- **Log Rotation**: Automatic cleanup of old test logs
- **Performance Monitoring**: Track response times and success rates
- **Error Alerting**: Notification system for critical failures
- **Regular Updates**: Persona questions and analysis criteria updates 