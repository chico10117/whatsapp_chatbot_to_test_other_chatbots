import OpenAI from 'openai';

export default class CinepolisResponseAnalyzer {
  constructor() {
    this.client = null;
    
    this.initializePromotionMaps();
  }

  getOpenAIClient() {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.client;
  }

  initializePromotionMaps() {
    // QR promotion mappings
    this.promotionMap = {
      'QR1': 'Mac & Cheese Boneless',
      'QR2': 'Touchdown Ruffles Dog', 
      'QR3': 'Mega Combo Baguis',
      'QR4': 'Comboletos 1',
      'QR5': 'Fiesta Cinépolis',
      'QR6': '10ª Temporada de Premios Cinépolis'
    };

    // Expected promotion categories
    this.promotionCategories = {
      'dulceria': ['Mac & Cheese Boneless', 'Touchdown Ruffles Dog', 'Mega Combo Baguis'],
      'taquilla': ['Comboletos 1', 'Fiesta Cinépolis', '10ª Temporada de Premios Cinépolis'],
      'combo': ['Mega Combo Baguis', 'Comboletos 1', 'Fiesta Cinépolis']
    };
  }

  async analyzePersonaResponses(persona, responses) {
    console.log(`🧠 Analyzing ${responses.length} responses for ${persona.name}...`);

    // Analyze each response individually
    const individualAnalyses = [];
    for (const response of responses) {
      if (response.response) {
        const analysis = await this.analyzeIndividualResponse(persona, response);
        individualAnalyses.push(analysis);
      }
    }

    // Generate overall persona analysis
    const overallAnalysis = await this.generatePersonaOverallAnalysis(persona, responses, individualAnalyses);

    return {
      persona: persona.name,
      totalResponses: responses.length,
      analyzedResponses: individualAnalyses.length,
      individualAnalyses,
      overallAnalysis,
      metrics: this.calculateMetrics(responses, individualAnalyses),
      qrAnalysis: this.analyzeQRDistribution(persona, responses)
    };
  }

  async analyzeIndividualResponse(persona, responseData) {
    const { question, response, receivedQR, qrType } = responseData;
    
    const analysisPrompt = `
    Analiza esta interacción entre ${persona.name} (${persona.demographic}) y el bot de Cinépolis "Paloma":

    PREGUNTA DEL USUARIO: "${question}"
    RESPUESTA DEL BOT: "${response}"
    QR RECIBIDO: ${receivedQR ? 'Sí' : 'No'}

    Contexto del usuario:
    - Demografía: ${persona.demographic}
    - Presupuesto: ${persona.characteristics.budget}
    - Tamaño de grupo: ${persona.characteristics.groupSize}
    - Intereses: ${persona.characteristics.interests.join(', ')}

    Evalúa la respuesta en estas categorías (puntúa de 1-5):

    1. RELEVANCIA: ¿La respuesta es relevante para la pregunta específica del usuario?
    2. PERSONALIZACIÓN: ¿La respuesta considera el perfil demográfico del usuario?
    3. INFORMACIÓN_PROMOCIONAL: ¿Proporciona información clara sobre promociones disponibles?
    4. CLARIDAD_LENGUAJE: ¿El lenguaje es claro y apropiado para el usuario mexicano?
    5. CALL_TO_ACTION: ¿Guía efectivamente al usuario hacia la siguiente acción?
    6. EMPATÍA_CULTURAL: ¿Demuestra comprensión del contexto cultural mexicano?

    Responde en formato JSON:
    {
      "scores": {
        "relevancia": <1-5>,
        "personalizacion": <1-5>,
        "informacion_promocional": <1-5>,
        "claridad_lenguaje": <1-5>,
        "call_to_action": <1-5>,
        "empatia_cultural": <1-5>
      },
      "strengths": ["fortaleza1", "fortaleza2"],
      "weaknesses": ["debilidad1", "debilidad2"],
      "promotion_mentioned": "nombre de promoción mencionada o null",
      "appropriate_for_user": true/false,
      "missing_information": ["información faltante"],
      "overall_rating": <1-5>
    }
    `;

    try {
      const gptResponse = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(gptResponse.choices[0].message.content);
      
      // Add QR validation if QR was received
      if (receivedQR) {
        analysis.qr_validation = this.validateQRForPersona(persona, analysis.promotion_mentioned);
      }

      return {
        question,
        response,
        receivedQR,
        analysis,
        timestamp: responseData.timestamp
      };

    } catch (error) {
      console.error('Error analyzing individual response:', error);
      return {
        question,
        response,
        receivedQR,
        analysis: this.getFallbackAnalysis(),
        timestamp: responseData.timestamp,
        error: error.message
      };
    }
  }

  validateQRForPersona(persona, promotionMentioned) {
    if (!promotionMentioned) return { valid: false, reason: 'No promotion identified' };

    const validation = {
      budgetMatch: false,
      groupMatch: false,
      categoryMatch: false,
      overallValid: false,
      reasons: []
    };

    // Check budget appropriateness
    const budgetValidation = {
      'low': ['Mac & Cheese Boneless', 'Touchdown Ruffles Dog'],
      'medium': ['Mega Combo Baguis', 'Comboletos 1'],
      'medium-high': ['Comboletos 1', 'Fiesta Cinépolis'],
      'high': ['Fiesta Cinépolis', '10ª Temporada de Premios Cinépolis']
    };

    validation.budgetMatch = budgetValidation[persona.characteristics.budget]?.includes(promotionMentioned) || false;
    
    // Check group size appropriateness
    const groupValidation = {
      'small': ['Mac & Cheese Boneless', 'Touchdown Ruffles Dog'],
      'couple': ['Mega Combo Baguis', 'Comboletos 1'],
      'large': ['Comboletos 1', 'Fiesta Cinépolis'],
      'senior': ['Mac & Cheese Boneless', 'Mega Combo Baguis'],
      'flexible': true // Any promotion works
    };

    validation.groupMatch = persona.characteristics.groupSize === 'flexible' || 
                           groupValidation[persona.characteristics.groupSize]?.includes(promotionMentioned) || false;

    // Overall validation
    validation.overallValid = validation.budgetMatch && validation.groupMatch;

    if (!validation.budgetMatch) {
      validation.reasons.push(`Promoción no apropiada para presupuesto ${persona.characteristics.budget}`);
    }
    if (!validation.groupMatch) {
      validation.reasons.push(`Promoción no apropiada para grupo ${persona.characteristics.groupSize}`);
    }

    return validation;
  }

  async generatePersonaOverallAnalysis(persona, responses, individualAnalyses) {
    const successfulResponses = responses.filter(r => r.response !== null);
    const qrResponses = responses.filter(r => r.receivedQR);
    
    const overallPrompt = `
    Genera un análisis general del desempeño del bot Paloma de Cinépolis con ${persona.name}, un ${persona.demographic} de ${persona.age} años.

    ESTADÍSTICAS DE LA SESIÓN:
    - Total de preguntas: ${responses.length}
    - Respuestas recibidas: ${successfulResponses.length}
    - QR codes enviados: ${qrResponses.length}
    - Tiempo promedio de respuesta: ${responses.filter(r => r.responseTime).reduce((a, b) => a + b.responseTime, 0) / responses.filter(r => r.responseTime).length || 0} segundos

    PERFIL DEL USUARIO:
    - Demografía: ${persona.demographic}
    - Personalidad: ${persona.personality}
    - Presupuesto: ${persona.characteristics.budget}
    - Tamaño de grupo: ${persona.characteristics.groupSize}
    - Intereses: ${persona.characteristics.interests.join(', ')}

    ANÁLISIS INDIVIDUALES:
    ${individualAnalyses.map((analysis, index) => `
    Pregunta ${index + 1}: Puntuación general ${analysis.analysis.overall_rating}/5
    Fortalezas: ${analysis.analysis.strengths?.join(', ') || 'N/A'}
    Debilidades: ${analysis.analysis.weaknesses?.join(', ') || 'N/A'}
    `).join('\n')}

    Proporciona un análisis comprehensivo en formato JSON:
    {
      "persona_satisfaction": <1-5>,
      "bot_effectiveness": <1-5>,
      "promotion_targeting": <1-5>,
      "cultural_appropriateness": <1-5>,
      "user_journey_flow": <1-5>,
      "key_strengths": ["fortaleza1", "fortaleza2", "fortaleza3"],
      "key_weaknesses": ["debilidad1", "debilidad2", "debilidad3"],
      "recommendations": ["recomendación1", "recomendación2", "recomendación3"],
      "promotions_effectiveness": {
        "appropriate_promotions": <count>,
        "inappropriate_promotions": <count>,
        "missing_opportunities": ["oportunidad1", "oportunidad2"]
      },
      "overall_grade": "A/B/C/D/F",
      "summary": "Resumen ejecutivo en 2-3 oraciones"
    }
    `;

    try {
      const gptResponse = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: overallPrompt }],
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      return JSON.parse(gptResponse.choices[0].message.content);
    } catch (error) {
      console.error('Error generating overall analysis:', error);
      return this.getFallbackOverallAnalysis();
    }
  }

  calculateMetrics(responses, analyses) {
    const successful = responses.filter(r => r.response !== null);
    const withQR = responses.filter(r => r.receivedQR);
    const avgResponseTime = successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length || 0;
    
    const avgScores = analyses.reduce((acc, analysis) => {
      const scores = analysis.analysis.scores || {};
      Object.keys(scores).forEach(key => {
        acc[key] = (acc[key] || 0) + scores[key];
      });
      return acc;
    }, {});

    Object.keys(avgScores).forEach(key => {
      avgScores[key] = avgScores[key] / analyses.length || 0;
    });

    return {
      totalQuestions: responses.length,
      successfulResponses: successful.length,
      responseRate: (successful.length / responses.length * 100).toFixed(1),
      qrReceived: withQR.length,
      qrRate: (withQR.length / responses.length * 100).toFixed(1),
      averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      averageScores: avgScores,
      overallScore: Object.values(avgScores).reduce((a, b) => a + b, 0) / Object.keys(avgScores).length || 0
    };
  }

  analyzeQRDistribution(persona, responses) {
    const qrResponses = responses.filter(r => r.receivedQR);
    const promotions = qrResponses.map(r => r.qrType).filter(Boolean);
    
    return {
      totalQRs: qrResponses.length,
      uniquePromotions: [...new Set(promotions)].length,
      promotionTypes: promotions,
      appropriateForPersona: qrResponses.filter(r => {
        // This would need the actual QR validation logic
        return true; // Placeholder
      }).length,
      timing: {
        averageTimeToFirstQR: this.calculateTimeToFirstQR(responses),
        qrDistributionPattern: this.analyzeQRTiming(responses)
      }
    };
  }

  calculateTimeToFirstQR(responses) {
    const firstQR = responses.find(r => r.receivedQR);
    if (!firstQR) return null;
    
    const firstResponseTime = responses[0]?.timestamp;
    if (!firstResponseTime) return null;
    
    return (firstQR.timestamp - firstResponseTime) / 1000; // seconds
  }

  analyzeQRTiming(responses) {
    const qrIndexes = responses
      .map((r, index) => r.receivedQR ? index + 1 : null)
      .filter(index => index !== null);
    
    return {
      qrPositions: qrIndexes,
      averagePosition: qrIndexes.reduce((a, b) => a + b, 0) / qrIndexes.length || 0,
      pattern: qrIndexes.length > 1 ? 'multiple' : qrIndexes.length === 1 ? 'single' : 'none'
    };
  }

  getFallbackAnalysis() {
    return {
      scores: {
        relevancia: 3,
        personalizacion: 3,
        informacion_promocional: 3,
        claridad_lenguaje: 3,
        call_to_action: 3,
        empatia_cultural: 3
      },
      strengths: ['Respuesta proporcionada'],
      weaknesses: ['Análisis no disponible'],
      promotion_mentioned: null,
      appropriate_for_user: null,
      missing_information: ['Análisis detallado no disponible'],
      overall_rating: 3
    };
  }

  getFallbackOverallAnalysis() {
    return {
      persona_satisfaction: 3,
      bot_effectiveness: 3,
      promotion_targeting: 3,
      cultural_appropriateness: 3,
      user_journey_flow: 3,
      key_strengths: ['Análisis no disponible'],
      key_weaknesses: ['Error en análisis'],
      recommendations: ['Revisar configuración de análisis'],
      promotions_effectiveness: {
        appropriate_promotions: 0,
        inappropriate_promotions: 0,
        missing_opportunities: []
      },
      overall_grade: 'C',
      summary: 'Análisis no disponible debido a error técnico.'
    };
  }
}