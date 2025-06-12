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