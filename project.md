Project Path: src

Source Tree:

```txt
src
├── ai-conversation-generator.js
├── feedback-generator.js
├── response-analyzer.js
├── test-logger.js
├── test-orchestrator.js
├── test-personas.js
└── utils

```

`src/ai-conversation-generator.js`:

```js
import OpenAI from 'openai';

export default class AIConversationGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.conversationHistory = new Map(); // Store conversation history per persona
  }

  async generateInitialQuestion(persona) {
    const systemPrompt = this.buildSystemPrompt(persona);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: "Generate your first question to start the conversation with the restaurant recommendation bot. Be natural and stay in character."
          }
        ],
        max_tokens: 150,
        temperature: 0.8
      });

      const question = response.choices[0].message.content.trim();
      
      // Initialize conversation history for this persona
      this.conversationHistory.set(persona.id, [
        { role: 'assistant', content: question }
      ]);

      return question;
    } catch (error) {
      console.error(`Error generating initial question for ${persona.name}:`, error);
      // Fallback to a basic question
      return this.getFallbackQuestion(persona);
    }
  }

  async generateFollowUpQuestion(persona, recoResponse, questionNumber) {
    const history = this.conversationHistory.get(persona.id) || [];
    
    // Add Reco's response to history
    history.push({ role: 'user', content: recoResponse });
    
    const systemPrompt = this.buildSystemPrompt(persona);
    
    // Check if we should end the conversation
    if (questionNumber >= persona.maxQuestions) {
      return null; // End conversation
    }

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "This is your conversation with a restaurant recommendation bot so far:" },
        ...history,
        { 
          role: "user", 
          content: `Generate your next question based on the bot's response. Stay in character. This is question ${questionNumber + 1} of ${persona.maxQuestions}. If the bot gave good recommendations, you might ask for more details, alternatives, or related questions. Be natural and conversational.`
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
        messages: messages,
        max_tokens: 150,
        temperature: 0.8
      });

      const question = response.choices[0].message.content.trim();
      
      // Add the new question to history
      history.push({ role: 'assistant', content: question });
      this.conversationHistory.set(persona.id, history);

      return question;
    } catch (error) {
      console.error(`Error generating follow-up question for ${persona.name}:`, error);
      return this.getFallbackFollowUp(persona, questionNumber);
    }
  }

  buildSystemPrompt(persona) {
    const language = persona.language === 'en' ? 'English' : 'Spanish';
    
    return `You are ${persona.name}, a ${persona.description}.

PERSONALITY: ${persona.personality}

INTERESTS: ${persona.interests.join(', ')}

CONVERSATION STYLE: ${persona.conversationStyle}

GOALS: ${persona.goals.join(', ')}

INSTRUCTIONS:
- Always respond in ${language}
- Stay completely in character as ${persona.name}
- You are chatting with a restaurant recommendation bot called RECO
- Ask questions naturally as this persona would
- Be conversational and realistic
- Don't break character or mention that you're an AI
- Keep questions focused on restaurants, food, and dining
- Ask follow-up questions based on what the bot tells you
- Show genuine interest in the recommendations
- Ask for specific details when appropriate
- Maximum one question per response
- Keep responses concise (1-2 sentences max)`;
  }

  getFallbackQuestion(persona) {
    const fallbacks = {
      health_conscious: "Hola, busco restaurantes con opciones veganas saludables",
      budget_conscious: "Hola, necesito encontrar comida buena y barata para estudiantes",
      family_kids: "Hola, busco restaurantes family-friendly con facilidades para niños",
      international_tourist: "Hi, I'm looking for authentic Spanish restaurants for tourists",
      foodie_adventurous: "Hola, busco experiencias gastronómicas únicas y de alta cocina"
    };
    
    return fallbacks[persona.id] || "Hola, ¿me puedes ayudar a encontrar un buen restaurante?";
  }

  getFallbackFollowUp(persona, questionNumber) {
    const fallbacks = {
      health_conscious: [
        "¿Tienen opciones sin gluten?",
        "¿Qué tan frescas son las ensaladas?", 
        "¿Usan ingredientes orgánicos?"
      ],
      budget_conscious: [
        "¿Cuánto cuesta aproximadamente?",
        "¿Tienen descuentos para estudiantes?",
        "¿Hay ofertas especiales?"
      ],
      family_kids: [
        "¿Tienen zona de juegos?",
        "¿Es seguro para niños pequeños?",
        "¿Tienen menú infantil?"
      ],
      international_tourist: [
        "Do they have English menus?",
        "Is it tourist-friendly?",
        "What makes it authentic?"
      ],
      foodie_adventurous: [
        "¿Qué técnicas culinarias usan?",
        "¿Tienen menú degustación?",
        "¿Qué ingredientes especiales usan?"
      ]
    };
    
    const options = fallbacks[persona.id] || ["¿Me puedes dar más detalles?"];
    return options[questionNumber % options.length];
  }

  resetConversation(personaId) {
    this.conversationHistory.delete(personaId);
  }

  getConversationHistory(personaId) {
    return this.conversationHistory.get(personaId) || [];
  }
} 
```

`src/feedback-generator.js`:

```js
export default class FeedbackGenerator {
  constructor() {
    this.reportTemplate = {
      title: "MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT",
      sections: ['metrics', 'recommendations', 'language', 'edgeCases', 'experience', 'suggestions']
    };
  }

  generateFinalReport(allTestResults, analysisResults) {
    const metrics = this.calculateGlobalMetrics(allTestResults, analysisResults);
    
    const report = `
MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT

📈 MÉTRICAS GENERALES:
- Total de preguntas: ${metrics.totalQuestions}
- Respuestas recibidas: ${metrics.totalResponses}/${metrics.totalQuestions}
- Tiempo promedio de respuesta: ${metrics.avgResponseTime.toFixed(2)} segundos
- Tasa de éxito: ${metrics.successRate.toFixed(1)}%

🎯 PRECISIÓN DE RECOMENDACIONES (por persona):
${this.generatePersonaScores(allTestResults, analysisResults)}

🗣️ CALIDAD DE LENGUAJE:
${this.generateLanguageAnalysis(allTestResults, analysisResults)}

⚠️ MANEJO DE CASOS LÍMITE:
${this.generateEdgeCaseAnalysis(allTestResults)}

🔄 FLUJO DE EXPERIENCIA:
${this.generateExperienceAnalysis(analysisResults)}

💡 RECOMENDACIONES:
${this.generateSuggestions(analysisResults, allTestResults)}

📊 RESUMEN EJECUTIVO:
${this.generateExecutiveSummary(metrics, analysisResults)}
    `.trim();

    return report;
  }

  calculateGlobalMetrics(allTestResults, analysisResults) {
    const totalQuestions = allTestResults.reduce((sum, persona) => sum + persona.questions.length, 0);
    const totalResponses = allTestResults.reduce((sum, persona) => 
      sum + persona.questions.filter(q => q.response).length, 0);
    
    const avgResponseTime = this.calculateAverageResponseTime(allTestResults);
    const successRate = (totalResponses / totalQuestions) * 100;
    
    const avgOverallScore = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / Object.keys(analysisResults).length;
    const totalRecommendations = Object.values(analysisResults).reduce((sum, r) => sum + r.totalRecommendations, 0);

    return {
      totalQuestions,
      totalResponses,
      avgResponseTime,
      successRate,
      avgOverallScore,
      totalRecommendations,
      personasCount: allTestResults.length
    };
  }

  generatePersonaScores(allTestResults, analysisResults) {
    const scores = [];
    
    allTestResults.forEach((persona, index) => {
      const score = analysisResults[persona.personaId];
      const stars = '⭐'.repeat(Math.round(score.overallScore));
      const emptyStars = '☆'.repeat(5 - Math.round(score.overallScore));
      
      scores.push(
        `${index + 1}. ${persona.personaName}: ${score.overallScore.toFixed(1)}/5 ${stars}${emptyStars}`
      );
      scores.push(
        `   📍 Respuestas: ${score.responseRate.toFixed(1)}% | Recomendaciones: ${score.recommendationRate.toFixed(1)}% | Idioma: ${score.languageConsistency.toFixed(1)}%`
      );
    });
    
    return scores.join('\n');
  }

  generateLanguageAnalysis(allTestResults, analysisResults) {
    const spanishPersonas = allTestResults.filter(p => p.language === 'es');
    const englishPersonas = allTestResults.filter(p => p.language === 'en');
    
    const spanishConsistency = spanishPersonas.length > 0 ? 
      spanishPersonas.reduce((sum, p) => sum + analysisResults[p.personaId].languageConsistency, 0) / spanishPersonas.length : 0;
    
    const englishConsistency = englishPersonas.length > 0 ? 
      englishPersonas.reduce((sum, p) => sum + analysisResults[p.personaId].languageConsistency, 0) / englishPersonas.length : 0;

    const grammarErrors = this.countGrammarErrors(allTestResults);
    const toneEvaluation = this.evaluateTone(allTestResults);

    return `- Consistencia en español: ${spanishConsistency.toFixed(1)}%
- Consistencia en inglés: ${englishConsistency.toFixed(1)}%
- Errores gramaticales detectados: ${grammarErrors}
- Tono apropiado: ${toneEvaluation}`;
  }

  generateEdgeCaseAnalysis(allTestResults) {
    const ambiguousQuestions = this.identifyAmbiguousQuestions(allTestResults);
    const specialRequests = this.identifySpecialRequests(allTestResults);
    const recoveredErrors = this.countRecoveredErrors(allTestResults);
    
    return `- Preguntas ambiguas: ${ambiguousQuestions.handled}/${ambiguousQuestions.total} manejadas correctamente
- Solicitudes especiales: ${specialRequests.handled}/${specialRequests.total} atendidas
- Errores recuperados: ${recoveredErrors}`;
  }

  generateExperienceAnalysis(analysisResults) {
    const avgClarity = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / Object.keys(analysisResults).length;
    const easeOfUse = this.evaluateEaseOfUse(analysisResults);
    const completeness = this.evaluateCompleteness(analysisResults);
    const additionalSuggestions = this.evaluateAdditionalSuggestions(analysisResults);
    
    return `- Claridad en respuestas: ${avgClarity.toFixed(1)}/5
- Facilidad de uso: ${easeOfUse}/5
- Información completa: ${completeness}/5
- Sugerencias adicionales: ${additionalSuggestions}/5`;
  }

  generateSuggestions(analysisResults, allTestResults) {
    const suggestions = [];
    
    // Analyze common issues and generate suggestions
    const avgScore = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / Object.keys(analysisResults).length;
    const avgResponseRate = Object.values(analysisResults).reduce((sum, r) => sum + r.responseRate, 0) / Object.keys(analysisResults).length;
    const avgRecommendationRate = Object.values(analysisResults).reduce((sum, r) => sum + r.recommendationRate, 0) / Object.keys(analysisResults).length;
    
    if (avgScore < 3.5) {
      suggestions.push("• Mejorar la precisión y relevancia de las recomendaciones");
    }
    
    if (avgResponseRate < 90) {
      suggestions.push("• Aumentar la tasa de respuesta del bot (actualmente " + avgResponseRate.toFixed(1) + "%)");
    }
    
    if (avgRecommendationRate < 70) {
      suggestions.push("• Incluir más recomendaciones específicas en las respuestas");
    }
    
    if (this.hasLanguageIssues(analysisResults)) {
      suggestions.push("• Mejorar la consistencia del idioma según la consulta del usuario");
    }
    
    if (this.hasResponseTimeIssues(allTestResults)) {
      suggestions.push("• Optimizar el tiempo de respuesta para mejor experiencia");
    }
    
    if (this.lacksPersonalization(analysisResults)) {
      suggestions.push("• Personalizar más las respuestas según el tipo de usuario");
    }
    
    // Add specific persona-based suggestions
    const personaSuggestions = this.generatePersonaSpecificSuggestions(analysisResults);
    suggestions.push(...personaSuggestions);
    
    return suggestions.length > 0 ? suggestions.join('\n') : "• El bot funciona correctamente en general";
  }

  generatePersonaSpecificSuggestions(analysisResults) {
    const suggestions = [];
    
    // Health-conscious user suggestions
    if (analysisResults.health_conscious && analysisResults.health_conscious.overallScore < 3.5) {
      suggestions.push("• Mejorar respuestas sobre opciones saludables y dietéticas");
    }
    
    // Budget-conscious user suggestions  
    if (analysisResults.budget_conscious && analysisResults.budget_conscious.overallScore < 3.5) {
      suggestions.push("• Incluir más información sobre precios y ofertas económicas");
    }
    
    // Family suggestions
    if (analysisResults.family_kids && analysisResults.family_kids.overallScore < 3.5) {
      suggestions.push("• Agregar más opciones familiares y servicios para niños");
    }
    
    // Tourist suggestions
    if (analysisResults.uk_tourist && analysisResults.uk_tourist.overallScore < 3.5) {
      suggestions.push("• Mejorar el soporte en inglés y recomendaciones turísticas");
    }
    
    // Foodie suggestions
    if (analysisResults.foodie_adventurous && analysisResults.foodie_adventurous.overallScore < 3.5) {
      suggestions.push("• Expandir conocimiento sobre gastronomía gourmet y experiencias únicas");
    }
    
    return suggestions;
  }

  generateExecutiveSummary(metrics, analysisResults) {
    const grade = this.getOverallGrade(metrics.avgOverallScore);
    const performance = this.getPerformanceLevel(metrics.avgOverallScore);
    
    return `
El bot RECO obtuvo una calificación general de ${grade} (${metrics.avgOverallScore.toFixed(1)}/5.0).
Nivel de rendimiento: ${performance}
Tasa de éxito: ${metrics.successRate.toFixed(1)}% de respuestas recibidas
${metrics.totalRecommendations} recomendaciones específicas proporcionadas
Tiempo promedio de respuesta: ${metrics.avgResponseTime.toFixed(1)} segundos

${this.getRecommendationSummary(metrics.avgOverallScore)}`;
  }

  getOverallGrade(score) {
    if (score >= 4.5) return 'A+';
    if (score >= 4.0) return 'A';
    if (score >= 3.5) return 'B+';
    if (score >= 3.0) return 'B';
    if (score >= 2.5) return 'B-';
    if (score >= 2.0) return 'C+';
    if (score >= 1.5) return 'C';
    if (score >= 1.0) return 'C-';
    return 'D';
  }

  getPerformanceLevel(score) {
    if (score >= 4.5) return 'EXCELENTE';
    if (score >= 4.0) return 'MUY BUENO';
    if (score >= 3.5) return 'BUENO';
    if (score >= 3.0) return 'SATISFACTORIO';
    if (score >= 2.5) return 'REGULAR';
    if (score >= 2.0) return 'NECESITA MEJORAS';
    if (score >= 1.0) return 'DEFICIENTE';
    return 'CRÍTICO';
  }

  getRecommendationSummary(score) {
    if (score >= 4.0) return 'Rendimiento excelente. El bot maneja bien la mayoría de consultas.';
    if (score >= 3.0) return 'Buen rendimiento general con oportunidades de mejora específicas.';
    if (score >= 2.0) return 'Rendimiento moderado. Se requieren mejoras importantes.';
    return 'Rendimiento bajo. Se necesita revisión integral del sistema.';
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
    let errorCount = 0;
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        if (q.analysis && q.analysis.errors) {
          errorCount += q.analysis.errors.filter(error => 
            error.toLowerCase().includes('gramática') || 
            error.toLowerCase().includes('ortografía')
          ).length;
        }
      });
    });
    return errorCount;
  }

  evaluateTone(allTestResults) {
    let appropriateCount = 0;
    let totalEvaluated = 0;
    
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        if (q.analysis && q.response) {
          totalEvaluated++;
          if (q.analysis.responseQuality !== 'poor' && q.analysis.responseQuality !== 'no_response') {
            appropriateCount++;
          }
        }
      });
    });
    
    const percentage = totalEvaluated > 0 ? (appropriateCount / totalEvaluated) * 100 : 0;
    return percentage > 80 ? '✓ Apropiado' : '⚠️ Necesita mejora';
  }

  identifyAmbiguousQuestions(allTestResults) {
    const ambiguousKeywords = ['algo', 'cualquier', 'no sé', 'tal vez', 'quizás'];
    let total = 0;
    let handled = 0;
    
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        const isAmbiguous = ambiguousKeywords.some(keyword => 
          q.question.toLowerCase().includes(keyword)
        );
        
        if (isAmbiguous) {
          total++;
          if (q.analysis && q.analysis.hasRecommendation) {
            handled++;
          }
        }
      });
    });
    
    return { handled, total };
  }

  identifySpecialRequests(allTestResults) {
    const specialKeywords = ['sin gluten', 'vegano', 'alérgico', 'discapacidad', 'accesible', 'parking'];
    let total = 0;
    let handled = 0;
    
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        const isSpecial = specialKeywords.some(keyword => 
          q.question.toLowerCase().includes(keyword)
        );
        
        if (isSpecial) {
          total++;
          if (q.analysis && q.analysis.containsExpectedKeywords) {
            handled++;
          }
        }
      });
    });
    
    return { handled, total };
  }

  countRecoveredErrors(allTestResults) {
    let recoveredCount = 0;
    
    allTestResults.forEach(persona => {
      persona.questions.forEach(q => {
        if (q.analysis && q.analysis.strengths) {
          recoveredCount += q.analysis.strengths.filter(strength => 
            strength.toLowerCase().includes('recuper') || 
            strength.toLowerCase().includes('corrig')
          ).length;
        }
      });
    });
    
    return recoveredCount;
  }

  evaluateEaseOfUse(analysisResults) {
    const scores = Object.values(analysisResults).map(r => r.overallScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(avgScore);
  }

  evaluateCompleteness(analysisResults) {
    const recommendationRates = Object.values(analysisResults).map(r => r.recommendationRate);
    const avgRate = recommendationRates.reduce((sum, rate) => sum + rate, 0) / recommendationRates.length;
    return Math.round(avgRate / 20); // Convert percentage to 1-5 scale
  }

  evaluateAdditionalSuggestions(analysisResults) {
    const responseRates = Object.values(analysisResults).map(r => r.responseRate);
    const avgRate = responseRates.reduce((sum, rate) => sum + rate, 0) / responseRates.length;
    return Math.round(avgRate / 20); // Convert percentage to 1-5 scale
  }

  hasLanguageIssues(analysisResults) {
    const avgLanguageConsistency = Object.values(analysisResults).reduce((sum, r) => sum + r.languageConsistency, 0) / Object.keys(analysisResults).length;
    return avgLanguageConsistency < 85; // Less than 85% consistency is considered an issue
  }

  hasResponseTimeIssues(allTestResults) {
    const avgResponseTime = this.calculateAverageResponseTime(allTestResults);
    return avgResponseTime > 10; // More than 10 seconds is considered slow
  }

  lacksPersonalization(analysisResults) {
    const avgKeywordRelevance = Object.values(analysisResults).reduce((sum, r) => sum + r.keywordRelevance, 0) / Object.keys(analysisResults).length;
    return avgKeywordRelevance < 60; // Less than 60% keyword relevance suggests lack of personalization
  }
} 
```

`src/response-analyzer.js`:

```js
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
        recommendationCount: 0,
        errors: ['No response received'],
        strengths: [],
        suggestions: ['Bot should respond to user questions']
      };
    }

    try {
      const analysisPrompt = `
        Analiza esta respuesta de un chatbot de recomendaciones de restaurantes en Madrid:
        
        PREGUNTA DEL USUARIO: "${question}"
        RESPUESTA DEL BOT: "${response}"
        IDIOMA ESPERADO: ${persona.language === 'es' ? 'Español' : 'English'}
        PERSONA: ${persona.description}
        PALABRAS CLAVE ESPERADAS: ${expectedKeywords.join(', ')}
        
        Evalúa la respuesta considerando:
        1. ¿Proporciona recomendaciones específicas de restaurantes?
        2. ¿Está en el idioma correcto?
        3. ¿Qué tan relevante es para la pregunta específica?
        4. ¿Incluye palabras clave relacionadas con la consulta?
        5. ¿La calidad general de la respuesta es buena?
        
        Responde ÚNICAMENTE en formato JSON:
        {
          "hasRecommendation": boolean,
          "languageCorrect": boolean,
          "relevanceScore": number (1-5, donde 5 es excelente),
          "containsExpectedKeywords": boolean,
          "responseQuality": "excellent|good|fair|poor|no_response",
          "recommendationCount": number,
          "errors": ["error1", "error2"],
          "strengths": ["strength1", "strength2"],
          "suggestions": ["suggestion1", "suggestion2"]
        }
      `;

      const gptResponse = await this.openaiClient.chat.completions.create({
        model: process.env.ANALYSIS_MODEL || 'gpt-4.1',
        messages: [
          { 
            role: "system", 
            content: "Eres un experto evaluador de chatbots de restaurantes. Analiza objetivamente las respuestas proporcionando feedback constructivo y preciso. Responde SOLO en formato JSON válido." 
          },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(gptResponse.choices[0].message.content);
      
      // Validate and sanitize the analysis
      return this.validateAnalysis(analysis);
      
    } catch (error) {
      console.error('Error analyzing response:', error);
      return {
        hasRecommendation: false,
        languageCorrect: false,
        relevanceScore: 0,
        containsExpectedKeywords: false,
        responseQuality: 'analysis_error',
        recommendationCount: 0,
        errors: ['Analysis failed: ' + error.message],
        strengths: [],
        suggestions: ['Unable to analyze response due to technical error']
      };
    }
  }

  validateAnalysis(analysis) {
    // Ensure all required fields are present and valid
    return {
      hasRecommendation: Boolean(analysis.hasRecommendation),
      languageCorrect: Boolean(analysis.languageCorrect),
      relevanceScore: Math.min(Math.max(Number(analysis.relevanceScore) || 0, 0), 5),
      containsExpectedKeywords: Boolean(analysis.containsExpectedKeywords),
      responseQuality: this.validateQuality(analysis.responseQuality),
      recommendationCount: Math.max(Number(analysis.recommendationCount) || 0, 0),
      errors: Array.isArray(analysis.errors) ? analysis.errors : [],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : []
    };
  }

  validateQuality(quality) {
    const validQualities = ['excellent', 'good', 'fair', 'poor', 'no_response', 'analysis_error'];
    return validQualities.includes(quality) ? quality : 'poor';
  }

  async analyzeAllPersonaResponses(personaResults) {
    console.log(`🔍 Analyzing responses for ${personaResults.personaName}...`);
    
    const persona = {
      language: personaResults.language,
      description: personaResults.description
    };

    // Get expected keywords based on persona ID
    const expectedKeywords = this.getExpectedKeywords(personaResults.personaId);
    
    for (let i = 0; i < personaResults.questions.length; i++) {
      const questionData = personaResults.questions[i];
      
      if (questionData.response) {
        console.log(`   🔍 Analyzing Q${i + 1}...`);
        
        const analysis = await this.analyzeResponse(
          questionData.question,
          questionData.response,
          persona,
          expectedKeywords
        );
        
        questionData.analysis = analysis;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        questionData.analysis = {
          hasRecommendation: false,
          languageCorrect: false,
          relevanceScore: 0,
          containsExpectedKeywords: false,
          responseQuality: 'no_response',
          recommendationCount: 0,
          errors: ['No response received'],
          strengths: [],
          suggestions: ['Bot should respond to all user questions']
        };
      }
    }
    
    return personaResults;
  }

  getExpectedKeywords(personaId) {
    const keywordMap = {
      'health_conscious': ['vegano', 'saludable', 'ensalada', 'orgánico', 'sin gluten', 'proteico', 'natural', 'keto', 'bajo en calorías'],
      'budget_conscious': ['barato', 'económico', 'descuento', 'oferta', 'menú del día', 'estudiante', 'euros', 'gratis', '2x1'],
      'family_kids': ['niños', 'familia', 'menú infantil', 'juegos', 'terraza', 'bebés', 'cumpleaños', 'actividades', 'seguro'],
      'uk_tourist': ['tapas', 'paella', 'authentic', 'tourist', 'english menu', 'michelin', 'sangria', 'spanish', 'local'],
      'foodie_adventurous': ['molecular', 'gourmet', 'michelin', 'degustación', 'chef', 'fusión', 'autor', 'exótico', 'auténtico']
    };
    
    return keywordMap[personaId] || [];
  }

  calculatePersonaScore(personaResults) {
    const questions = personaResults.questions;
    const totalQuestions = questions.length;
    
    if (totalQuestions === 0) return this.getEmptyScore();

    let totalScore = 0;
    let responsesReceived = 0;
    let recommendationsProvided = 0;
    let languageConsistency = 0;
    let keywordMatches = 0;

    questions.forEach(q => {
      if (q.analysis) {
        if (q.response) responsesReceived++;
        if (q.analysis.hasRecommendation) recommendationsProvided++;
        if (q.analysis.languageCorrect) languageConsistency++;
        if (q.analysis.containsExpectedKeywords) keywordMatches++;
        totalScore += q.analysis.relevanceScore || 0;
      }
    });

    return {
      overallScore: totalScore / totalQuestions,
      responseRate: (responsesReceived / totalQuestions) * 100,
      recommendationRate: (recommendationsProvided / totalQuestions) * 100,
      languageConsistency: (languageConsistency / totalQuestions) * 100,
      keywordRelevance: (keywordMatches / totalQuestions) * 100,
      averageRelevance: totalScore / totalQuestions,
      qualityDistribution: this.getQualityDistribution(questions),
      totalQuestions,
      totalResponses: responsesReceived,
      totalRecommendations: recommendationsProvided
    };
  }

  getEmptyScore() {
    return {
      overallScore: 0,
      responseRate: 0,
      recommendationRate: 0,
      languageConsistency: 0,
      keywordRelevance: 0,
      averageRelevance: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, no_response: 0 },
      totalQuestions: 0,
      totalResponses: 0,
      totalRecommendations: 0
    };
  }

  getQualityDistribution(questions) {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      no_response: 0,
      analysis_error: 0
    };

    questions.forEach(q => {
      if (q.analysis && q.analysis.responseQuality) {
        distribution[q.analysis.responseQuality]++;
      }
    });

    return distribution;
  }

  async analyzeAllTestResults(allTestResults) {
    const analysisResults = {};
    
    console.log(`\n🔍 Starting comprehensive analysis of all test results...`);
    
    for (const personaResults of allTestResults) {
      console.log(`\n📊 Analyzing ${personaResults.personaName}...`);
      
      // Analyze individual responses
      await this.analyzeAllPersonaResponses(personaResults);
      
      // Calculate persona score
      const score = this.calculatePersonaScore(personaResults);
      analysisResults[personaResults.personaId] = score;
      
      console.log(`   ✅ ${personaResults.personaName}: ${score.overallScore.toFixed(1)}/5 (${score.responseRate.toFixed(1)}% response rate)`);
    }
    
    console.log(`\n✅ Analysis complete for all personas`);
    return analysisResults;
  }

  generateQuickSummary(analysisResults) {
    const personaCount = Object.keys(analysisResults).length;
    const avgScore = Object.values(analysisResults).reduce((sum, r) => sum + r.overallScore, 0) / personaCount;
    const avgResponseRate = Object.values(analysisResults).reduce((sum, r) => sum + r.responseRate, 0) / personaCount;
    
    return {
      averageScore: avgScore,
      averageResponseRate: avgResponseRate,
      personasAnalyzed: personaCount,
      overallGrade: this.getOverallGrade(avgScore)
    };
  }

  getOverallGrade(score) {
    if (score >= 4.5) return 'A';
    if (score >= 4.0) return 'B+';
    if (score >= 3.5) return 'B';
    if (score >= 3.0) return 'B-';
    if (score >= 2.5) return 'C+';
    if (score >= 2.0) return 'C';
    if (score >= 1.5) return 'C-';
    if (score >= 1.0) return 'D';
    return 'F';
  }
} 
```

`src/test-logger.js`:

```js
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
      console.log(`📁 Created test-logs directory`);
    }
  }

  async savePersonaResults(personaResults) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${personaResults.personaId}_${timestamp}.json`;
    const filepath = path.join(this.logsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(personaResults, null, 2));
    console.log(`📁 Saved results for ${personaResults.personaName} to ${filename}`);
    
    return filename;
  }

  async saveFullTestResults(allResults) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full_test_${timestamp}.json`;
    const filepath = path.join(this.logsDir, filename);
    
    const testSummary = {
      timestamp: new Date().toISOString(),
      totalPersonas: allResults.length,
      totalQuestions: allResults.reduce((sum, persona) => sum + persona.questions.length, 0),
      totalResponses: allResults.reduce((sum, persona) => 
        sum + persona.questions.filter(q => q.response).length, 0),
      testResults: allResults
    };
    
    await fs.writeFile(filepath, JSON.stringify(testSummary, null, 2));
    console.log(`📁 Saved complete test results to ${filename}`);
    
    return filename;
  }

  async loadTestResults(filename) {
    const filepath = path.join(this.logsDir, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  }

  async listTestResults() {
    try {
      const files = await fs.readdir(this.logsDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('Error listing test results:', error);
      return [];
    }
  }

  logTestStart(testId) {
    console.log(`\n🚀 [${new Date().toLocaleTimeString()}] Starting BOTTY test session: ${testId}`);
    console.log(`📊 Testing Reco bot with 5 AI-powered personas (dynamic conversations)`);
  }

  logPersonaStart(persona) {
    console.log(`\n👤 [${new Date().toLocaleTimeString()}] Starting persona: ${persona.name} (${persona.language})`);
    const questionCount = persona.questions ? persona.questions.length : persona.maxQuestions || 15;
    console.log(`   📝 ${questionCount} questions planned`);
  }

  logQuestionSent(questionNumber, question, persona) {
    const preview = question.length > 60 ? question.substring(0, 57) + '...' : question;
    console.log(`   📤 [${new Date().toLocaleTimeString()}] Q${questionNumber}/15: ${preview}`);
    console.log(`   ⏳ Waiting for RECO response...`);
  }

  logResponseReceived(questionNumber, responseTime, hasResponse) {
    const status = hasResponse ? '✅' : '❌';
    const timeStr = responseTime ? `${(responseTime / 1000).toFixed(1)}s` : 'timeout';
    console.log(`   📥 [${new Date().toLocaleTimeString()}] Response ${status} (${timeStr})`);
    
    if (hasResponse) {
      console.log(`   ✅ Ready to proceed to next question`);
    } else {
      console.log(`   ⚠️  No response received, proceeding anyway`);
    }
  }

  logPersonaComplete(persona, duration) {
    const durationStr = `${(duration / 1000 / 60).toFixed(1)}min`;
    console.log(`   ✅ [${new Date().toLocaleTimeString()}] Completed ${persona.name} in ${durationStr}`);
  }

  logTestComplete(totalDuration, totalQuestions, totalResponses) {
    const durationStr = `${(totalDuration / 1000 / 60).toFixed(1)}min`;
    const successRate = ((totalResponses / totalQuestions) * 100).toFixed(1);
    console.log(`\n🎉 [${new Date().toLocaleTimeString()}] Test completed in ${durationStr}`);
    console.log(`📊 Results: ${totalResponses}/${totalQuestions} responses (${successRate}% success rate)`);
  }

  logError(context, error) {
    console.error(`❌ [${new Date().toLocaleTimeString()}] Error in ${context}:`, error.message);
  }
} 
```

`src/test-orchestrator.js`:

```js
import { AI_PERSONAS } from './test-personas.js';
import AIConversationGenerator from './ai-conversation-generator.js';
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
    this.responseCallback = null;
    this.testId = `test_${Date.now()}`;
    this.aiGenerator = new AIConversationGenerator();
  }

  async executeAllPersonas(whatsappClient, recoNumber) {
    this.logger.logTestStart(this.testId);
    const testStartTime = Date.now();
    
    try {
      for (const [personaId, persona] of Object.entries(AI_PERSONAS)) {
        console.log(`\n🎭 Starting AI-powered conversation with ${persona.name}`);
        console.log(`   📋 Profile: ${persona.description}`);
        console.log(`   🎯 Language: ${persona.language.toUpperCase()}`);
        console.log(`   📊 Target: ${persona.maxQuestions} dynamic questions`);
        
        this.logger.logPersonaStart(persona);
        await this.executePersona(whatsappClient, recoNumber, persona);
        
        // Wait between personas to avoid overwhelming Reco
        console.log(`   ⏸️  Waiting 5 seconds before next persona...`);
        await delay(5000);
      }
      
      const totalDuration = Date.now() - testStartTime;
      const totalQuestions = this.testResults.reduce((sum, persona) => sum + persona.questions.length, 0);
      const totalResponses = this.testResults.reduce((sum, persona) => 
        sum + persona.questions.filter(q => q.response).length, 0);
      
      this.logger.logTestComplete(totalDuration, totalQuestions, totalResponses);
      
      // Save complete test results
      await this.logger.saveFullTestResults(this.testResults);
      
      return this.testResults;
    } catch (error) {
      this.logger.logError('executeAllPersonas', error);
      throw error;
    }
  }

  async executePersona(whatsappClient, recoNumber, persona) {
    this.currentPersona = persona;
    this.currentQuestionIndex = 0;
    const personaStartTime = Date.now();
    
    const personaResults = {
      personaId: persona.id,
      personaName: persona.name,
      language: persona.language,
      description: persona.description,
      startTime: new Date(),
      questions: [],
      summary: {},
      conversationType: 'AI_GENERATED'
    };

    try {
      // Reset conversation history for this persona
      this.aiGenerator.resetConversation(persona.id);
      
      // Generate and send initial question
      console.log(`   🤖 Generating initial question for ${persona.name}...`);
      const initialQuestion = await this.aiGenerator.generateInitialQuestion(persona);
      
      console.log(`   💭 ${persona.name}: "${initialQuestion}"`);
      
      // Send initial question
      const questionResult = await this.sendQuestionAndWaitResponse(
        whatsappClient, 
        recoNumber, 
        initialQuestion, 
        1
      );
      
      personaResults.questions.push(questionResult);
      this.currentQuestionIndex = 1;
      
      // Continue conversation with AI-generated follow-ups
      while (this.currentQuestionIndex < persona.maxQuestions) {
        // Only generate follow-up if we got a response
        if (!questionResult.response && this.currentQuestionIndex === 1) {
          console.log(`   ⚠️  No response to initial question, ending conversation for ${persona.name}`);
          break;
        }
        
        const lastResponse = personaResults.questions[personaResults.questions.length - 1].response;
        if (!lastResponse) {
          console.log(`   ⚠️  No response received, ending conversation for ${persona.name}`);
          break;
        }
        
        // Generate follow-up question based on Reco's response
        console.log(`   🤖 Generating follow-up question ${this.currentQuestionIndex + 1}...`);
        const followUpQuestion = await this.aiGenerator.generateFollowUpQuestion(
          persona, 
          lastResponse, 
          this.currentQuestionIndex
        );
        
        if (!followUpQuestion) {
          console.log(`   ✅ Conversation complete for ${persona.name}`);
          break;
        }
        
        console.log(`   💭 ${persona.name}: "${followUpQuestion}"`);
        
        // Send follow-up question
        const followUpResult = await this.sendQuestionAndWaitResponse(
          whatsappClient, 
          recoNumber, 
          followUpQuestion, 
          this.currentQuestionIndex + 1
        );
        
        personaResults.questions.push(followUpResult);
        this.currentQuestionIndex++;
        
        // Add delay between questions to be respectful
        if (this.currentQuestionIndex < persona.maxQuestions) {
          console.log(`   ⏳ Waiting 3 seconds before next question...`);
          await delay(3000);
        }
      }
      
      personaResults.endTime = new Date();
      personaResults.duration = personaResults.endTime - personaResults.startTime;
      
      // Log persona completion
      const personaDuration = Date.now() - personaStartTime;
      const questionsAsked = personaResults.questions.length;
      const responsesReceived = personaResults.questions.filter(q => q.response).length;
      
      console.log(`   ✅ ${persona.name} completed: ${questionsAsked} questions, ${responsesReceived} responses`);
      this.logger.logPersonaComplete(persona, personaDuration);
      
      this.testResults.push(personaResults);
      
      // Save individual persona results
      await this.logger.savePersonaResults(personaResults);
      
      return personaResults;
    } catch (error) {
      this.logger.logError(`executePersona-${persona.name}`, error);
      throw error;
    }
  }

  async sendQuestionAndWaitResponse(whatsappClient, recoNumber, question, questionNumber) {
    const sentTime = new Date();
    
    try {
      // Send question to Reco
      await whatsappClient.sendMessage(recoNumber, { text: question });
      console.log(`   📤 Message sent, waiting for RECO response...`);
      
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
        analysis: {},
        isAIGenerated: true
      };
      
      // Wait for response with timeout
      const timeoutMs = process.env.TEST_TIMEOUT_MS || 30000; // 30 seconds default
      console.log(`   ⏱️  Waiting up to ${timeoutMs/1000}s for response...`);
      
      const response = await this.waitForResponse(timeoutMs);
      
      if (response) {
        questionResult.response = response.text;
        questionResult.receivedAt = response.timestamp;
        questionResult.responseTime = response.timestamp - sentTime;
        console.log(`   ✅ Response received in ${(questionResult.responseTime/1000).toFixed(1)}s`);
        console.log(`   🤖 RECO: "${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`   ⏰ No response received within timeout period`);
      }
      
      // Ensure we're no longer waiting before proceeding
      this.isWaitingForResponse = false;
      
      return questionResult;
    } catch (error) {
      this.logger.logError(`sendQuestion-${questionNumber}`, error);
      this.isWaitingForResponse = false;
      
      return {
        questionNumber,
        question,
        sentAt: sentTime,
        response: null,
        receivedAt: null,
        responseTime: null,
        analysis: {},
        error: error.message,
        isAIGenerated: true
      };
    }
  }

  async waitForResponse(timeoutMs) {
    return new Promise((resolve) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        console.log(`   ⌛ Timeout reached, proceeding to next question`);
        this.responseCallback = null;
        resolve(null); // No response received
      }, timeoutMs);
      
      // This will be called by the message handler when response is received
      this.responseCallback = (response) => {
        console.log(`   📨 RECO response received, proceeding to next question`);
        clearTimeout(timeout);
        this.responseCallback = null;
        resolve(response);
      };
      
      console.log(`   👂 Listening for RECO response...`);
    });
  }

  handleIncomingMessage(message) {
    // Only process messages when we're actively waiting for a response
    if (this.isWaitingForResponse && this.responseCallback) {
      console.log(`   📥 Incoming message from RECO detected`);
      
      // Extract text from different message types
      let messageText = '';
      
      if (message.message?.conversation) {
        messageText = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        messageText = message.message.extendedTextMessage.text;
      } else if (message.message?.buttonsResponseMessage?.selectedDisplayText) {
        messageText = message.message.buttonsResponseMessage.selectedDisplayText;
      } else if (message.message?.listResponseMessage?.title) {
        messageText = message.message.listResponseMessage.title;
      } else if (message.message?.imageMessage?.caption) {
        messageText = message.message.imageMessage.caption || '[Image message]';
      } else if (message.message?.videoMessage?.caption) {
        messageText = message.message.videoMessage.caption || '[Video message]';
      } else if (message.message?.audioMessage) {
        messageText = '[Audio message]';
      } else if (message.message?.documentMessage?.fileName) {
        messageText = `[Document: ${message.message.documentMessage.fileName}]`;
      } else {
        // Fallback for unknown message types
        messageText = JSON.stringify(message.message);
      }
      
      const response = {
        text: messageText,
        timestamp: new Date(),
        messageType: this.getMessageType(message),
        rawMessage: message.message
      };
      
      // Trigger the response callback
      this.responseCallback(response);
    } else {
      console.log(`   ℹ️  Received message from RECO but not currently waiting (ignoring)`);
    }
  }

  getMessageType(message) {
    if (message.message?.conversation) return 'text';
    if (message.message?.extendedTextMessage) return 'extended_text';
    if (message.message?.buttonsResponseMessage) return 'button_response';
    if (message.message?.listResponseMessage) return 'list_response';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    return 'unknown';
  }

  getCurrentStatus() {
    return {
      testId: this.testId,
      isActive: this.isWaitingForResponse,
      currentPersona: this.currentPersona?.name || null,
      currentQuestion: this.currentQuestionIndex + 1,
      totalCompleted: this.testResults.length,
      totalPersonas: Object.keys(AI_PERSONAS).length,
      conversationType: 'AI_GENERATED'
    };
  }

  reset() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
    this.responseCallback = null;
    this.testId = `test_${Date.now()}`;
    
    // Reset AI conversation histories
    if (this.aiGenerator) {
      Object.keys(AI_PERSONAS).forEach(personaId => {
        this.aiGenerator.resetConversation(personaId);
      });
    }
    
    console.log(`🔄 Test orchestrator reset with AI conversation generator`);
  }
} 
```

`src/test-personas.js`:

```js
export const AI_PERSONAS = {
  health_conscious: {
    id: 'health_conscious',
    name: 'María Fitness',
    language: 'es',
    description: 'Usuario consciente de la salud que busca opciones nutritivas',
    personality: 'Soy María, una entrenadora personal de 28 años muy consciente de mi alimentación. Me enfoco en opciones veganas, orgánicas y nutritivas. Hablo de manera directa pero amigable.',
    interests: ['comida vegana', 'opciones sin gluten', 'restaurantes orgánicos', 'smoothies', 'ensaladas', 'proteínas vegetales'],
    conversationStyle: 'directa, enfocada en la salud, hace preguntas específicas sobre ingredientes',
    goals: ['encontrar opciones saludables', 'conocer información nutricional', 'opciones veganas/vegetarianas'],
    maxQuestions: 15
  },

  budget_conscious: {
    id: 'budget_conscious', 
    name: 'Carlos Estudiante',
    language: 'es',
    description: 'Estudiante universitario con presupuesto limitado',
    personality: 'Soy Carlos, estudiante de 21 años con presupuesto muy ajustado. Busco la mejor relación calidad-precio y siempre pregunto por descuentos. Soy casual y directo.',
    interests: ['menús del día baratos', 'descuentos estudiantes', 'ofertas 2x1', 'happy hour', 'buffets libres', 'tapas económicas'],
    conversationStyle: 'casual, siempre pregunta precios, busca ofertas y descuentos',
    goals: ['encontrar comida barata', 'maximizar cantidad por euro', 'descuentos especiales'],
    maxQuestions: 15
  },

  family_kids: {
    id: 'family_kids',
    name: 'Ana Familia', 
    language: 'es',
    description: 'Madre de familia con dos niños pequeños',
    personality: 'Soy Ana, madre de dos niños de 4 y 7 años. Necesito lugares family-friendly con facilidades para niños. Soy práctica y organizada.',
    interests: ['restaurantes con zona de juegos', 'menús infantiles', 'espacios seguros', 'tronas', 'actividades para niños'],
    conversationStyle: 'práctica, pregunta por facilidades específicas para niños, organizada',
    goals: ['lugares seguros para niños', 'entretenimiento infantil', 'comodidades familiares'],
    maxQuestions: 15
  },

  international_tourist: {
    id: 'international_tourist',
    name: 'James British',
    language: 'en', 
    description: 'British tourist visiting Spain for the first time',
    personality: 'I\'m James, a 35-year-old tourist from London visiting Madrid for the first time. I want authentic Spanish experiences but also need some comfort foods. I\'m polite and curious.',
    interests: ['authentic Spanish food', 'tapas', 'paella', 'local experiences', 'tourist-friendly places', 'English menus'],
    conversationStyle: 'polite, curious about local culture, asks for authentic experiences',
    goals: ['authentic Spanish cuisine', 'tourist-friendly service', 'cultural food experiences'],
    maxQuestions: 15
  },

  foodie_adventurous: {
    id: 'foodie_adventurous',
    name: 'Diego Gourmet',
    language: 'es', 
    description: 'Foodie aventurero que busca experiencias gastronómicas únicas',
    personality: 'Soy Diego, chef aficionado de 32 años que busca experiencias gastronómicas únicas. Me interesa la alta cocina, ingredientes exóticos y técnicas innovadoras. Hablo con conocimiento culinario.',
    interests: ['cocina molecular', 'menús degustación', 'chefs reconocidos', 'ingredientes exóticos', 'técnicas innovadoras', 'maridajes'],
    conversationStyle: 'sofisticada, usa terminología culinaria, busca experiencias únicas',
    goals: ['alta cocina', 'experiencias gastronómicas únicas', 'innovación culinaria'],
    maxQuestions: 15
  }
};

// Legacy export for backwards compatibility
export const TEST_PERSONAS = AI_PERSONAS; 
```