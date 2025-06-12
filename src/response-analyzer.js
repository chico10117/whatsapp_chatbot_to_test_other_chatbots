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