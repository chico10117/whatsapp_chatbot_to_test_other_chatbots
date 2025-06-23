import OpenAI from 'openai';

export default class CinepolisFeedbackGenerator {
  constructor() {
    this.client = null;
  }

  getOpenAIClient() {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.client;
  }

  async generateFinalReport(allPersonaResults) {
    console.log('📊 Generating comprehensive final report...');

    // Calculate overall statistics
    const overallStats = this.calculateOverallStatistics(allPersonaResults);
    
    // Generate executive summary
    const executiveSummary = await this.generateExecutiveSummary(allPersonaResults, overallStats);
    
    // Generate detailed analysis by persona
    const personaAnalysis = this.generatePersonaBreakdown(allPersonaResults);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(allPersonaResults);

    // Format final report
    const finalReport = this.formatFinalReport({
      overallStats,
      executiveSummary,
      personaAnalysis,
      recommendations,
      timestamp: new Date()
    });

    return finalReport;
  }

  calculateOverallStatistics(results) {
    const totalQuestions = results.reduce((sum, r) => sum + r.questions, 0);
    const totalResponses = results.reduce((sum, r) => sum + r.responses, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successfulResponses, 0);
    const totalQRs = results.reduce((sum, r) => sum + r.qrReceived, 0);
    
    const avgResponseTime = results.reduce((sum, r) => sum + (r.averageResponseTime || 0), 0) / results.length;
    
    // Calculate average scores across all personas
    const allAnalyses = results.flatMap(r => r.analysis?.individualAnalyses || []);
    const avgScores = this.calculateAverageScores(allAnalyses);
    
    // Calculate persona satisfaction
    const personaSatisfactions = results.map(r => r.analysis?.overallAnalysis?.persona_satisfaction || 3);
    const avgPersonaSatisfaction = personaSatisfactions.reduce((a, b) => a + b, 0) / personaSatisfactions.length;

    return {
      totalQuestions,
      totalResponses,
      totalSuccessful,
      totalQRs,
      responseRate: (totalSuccessful / totalQuestions * 100).toFixed(1),
      qrRate: (totalQRs / totalQuestions * 100).toFixed(1),
      avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      avgScores,
      avgPersonaSatisfaction: parseFloat(avgPersonaSatisfaction.toFixed(2)),
      personas: results.length,
      testDuration: this.calculateTestDuration(results)
    };
  }

  calculateAverageScores(analyses) {
    if (analyses.length === 0) return {};
    
    const scoreCategories = [
      'relevancia', 'personalizacion', 'informacion_promocional', 
      'claridad_lenguaje', 'call_to_action', 'empatia_cultural'
    ];
    
    const avgScores = {};
    scoreCategories.forEach(category => {
      const scores = analyses
        .map(a => a.analysis?.scores?.[category])
        .filter(score => score !== undefined && score !== null);
      
      avgScores[category] = scores.length > 0 
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
        : 0;
    });

    return avgScores;
  }

  calculateTestDuration(results) {
    const startTimes = results.map(r => new Date(r.startTime)).filter(Boolean);
    const endTimes = results.map(r => new Date(r.endTime)).filter(Boolean);
    
    if (startTimes.length === 0 || endTimes.length === 0) return 0;
    
    const earliestStart = Math.min(...startTimes);
    const latestEnd = Math.max(...endTimes);
    
    return Math.round((latestEnd - earliestStart) / 1000 / 60); // minutes
  }

  async generateExecutiveSummary(results, stats) {
    const summaryPrompt = `
    Genera un resumen ejecutivo profesional del desempeño del bot Paloma de Cinépolis basado en las siguientes estadísticas:

    ESTADÍSTICAS GENERALES:
    - ${stats.personas} personas mexicanas diferentes probaron el bot
    - ${stats.totalQuestions} preguntas enviadas en total
    - ${stats.responseRate}% de tasa de respuesta
    - ${stats.qrRate}% de preguntas resultaron en códigos QR
    - Tiempo promedio de respuesta: ${stats.avgResponseTime} segundos
    - Satisfacción promedio: ${stats.avgPersonaSatisfaction}/5

    PUNTUACIONES PROMEDIO:
    - Relevancia: ${stats.avgScores.relevancia || 0}/5
    - Personalización: ${stats.avgScores.personalizacion || 0}/5
    - Información promocional: ${stats.avgScores.informacion_promocional || 0}/5
    - Claridad del lenguaje: ${stats.avgScores.claridad_lenguaje || 0}/5
    - Call to action: ${stats.avgScores.call_to_action || 0}/5
    - Empatía cultural: ${stats.avgScores.empatia_cultural || 0}/5

    PERSONAS EVALUADAS:
    ${results.map(r => `- ${r.persona}: ${r.successfulResponses}/${r.questions} respuestas, ${r.qrReceived} QRs`).join('\n')}

    Proporciona un resumen ejecutivo en español, profesional y constructivo, en formato JSON:
    {
      "overall_grade": "A/B/C/D/F",
      "performance_summary": "Resumen de 2-3 oraciones del desempeño general",
      "key_achievements": ["logro1", "logro2", "logro3"],
      "main_concerns": ["preocupación1", "preocupación2"],
      "business_impact": "Impacto en el negocio de Cinépolis",
      "next_steps": ["paso1", "paso2", "paso3"]
    }
    `;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 1000,
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating executive summary:', error);
      return {
        overall_grade: 'C',
        performance_summary: 'Análisis ejecutivo no disponible debido a error técnico.',
        key_achievements: ['Completó testing básico'],
        main_concerns: ['Error en generación de análisis'],
        business_impact: 'Impacto no determinado',
        next_steps: ['Revisar configuración del sistema']
      };
    }
  }

  generatePersonaBreakdown(results) {
    return results.map(result => {
      const analysis = result.analysis?.overallAnalysis || {};
      
      return {
        name: result.persona,
        demographic: result.demographic,
        performance: {
          responseRate: `${result.successfulResponses}/${result.questions}`,
          qrReceived: result.qrReceived,
          avgResponseTime: result.averageResponseTime || 0,
          satisfaction: analysis.persona_satisfaction || 'N/A'
        },
        strengths: analysis.key_strengths || [],
        weaknesses: analysis.key_weaknesses || [],
        grade: analysis.overall_grade || 'N/A',
        summary: analysis.summary || 'Análisis no disponible'
      };
    });
  }

  async generateRecommendations(results) {
    const recommendationsPrompt = `
    Basándote en los resultados de prueba de ${results.length} personas mexicanas diferentes evaluando el bot Paloma de Cinépolis, genera recomendaciones específicas y accionables.

    RESULTADOS POR PERSONA:
    ${results.map(r => `
    ${r.persona} (${r.demographic}):
    - Respuestas: ${r.successfulResponses}/${r.questions} 
    - QRs recibidos: ${r.qrReceived}
    - Satisfacción: ${r.analysis?.overallAnalysis?.persona_satisfaction || 'N/A'}/5
    - Principales problemas: ${r.analysis?.overallAnalysis?.key_weaknesses?.join(', ') || 'N/A'}
    `).join('\n')}

    Las recomendaciones deben ser específicas para:
    1. Mejoras en personalización por demografía
    2. Optimización de promociones QR
    3. Mejoras en el flujo conversacional
    4. Ajustes culturales y de lenguaje para mexicanos
    5. Mejoras técnicas del sistema

    Responde en formato JSON:
    {
      "immediate_actions": [
        {"priority": "high/medium/low", "action": "descripción", "impact": "descripción del impacto"}
      ],
      "personalization_improvements": [
        {"persona": "tipo de usuario", "recommendation": "mejora específica"}
      ],
      "promotion_optimization": [
        {"issue": "problema identificado", "solution": "solución propuesta"}
      ],
      "technical_improvements": [
        {"area": "área técnica", "improvement": "mejora específica"}
      ],
      "cultural_adjustments": [
        {"aspect": "aspecto cultural", "adjustment": "ajuste recomendado"}
      ]
    }
    `;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: recommendationsPrompt }],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {
        immediate_actions: [
          { priority: 'high', action: 'Revisar configuración del sistema de análisis', impact: 'Permitir análisis futuro' }
        ],
        personalization_improvements: [],
        promotion_optimization: [],
        technical_improvements: [],
        cultural_adjustments: []
      };
    }
  }

  formatFinalReport(reportData) {
    const { overallStats, executiveSummary, personaAnalysis, recommendations } = reportData;
    
    const report = `
🎬 REPORTE FINAL - EVALUACIÓN BOT PALOMA CINÉPOLIS
===============================================

📊 MÉTRICAS GENERALES:
- Total de preguntas: ${overallStats.totalQuestions}
- Respuestas recibidas: ${overallStats.totalSuccessful}/${overallStats.totalResponses}
- Tasa de respuesta: ${overallStats.responseRate}%
- Códigos QR enviados: ${overallStats.totalQRs}
- Tasa de conversión QR: ${overallStats.qrRate}%
- Tiempo promedio de respuesta: ${overallStats.avgResponseTime}s
- Duración total del test: ${overallStats.testDuration} minutos

🎯 CALIFICACIÓN GENERAL: ${executiveSummary.overall_grade}

📈 PUNTUACIONES PROMEDIO:
${Object.entries(overallStats.avgScores).map(([key, value]) => 
  `- ${this.formatScoreLabel(key)}: ${value}/5 ${this.getStarRating(value)}`
).join('\n')}

👥 RENDIMIENTO POR PERSONA:
${personaAnalysis.map(persona => `
${persona.name} (${persona.demographic}):
• Respuestas: ${persona.performance.responseRate}
• QRs recibidos: ${persona.performance.qrReceived}
• Tiempo promedio: ${(persona.performance.avgResponseTime || 0).toFixed(1)}s
• Satisfacción: ${persona.performance.satisfaction}/5
• Calificación: ${persona.grade}
• Fortalezas: ${persona.strengths.join(', ')}
• Áreas de mejora: ${persona.weaknesses.join(', ')}
`).join('\n')}

📋 RESUMEN EJECUTIVO:
${executiveSummary.performance_summary}

🏆 PRINCIPALES LOGROS:
${executiveSummary.key_achievements.map(achievement => `• ${achievement}`).join('\n')}

⚠️ ÁREAS DE PREOCUPACIÓN:
${executiveSummary.main_concerns.map(concern => `• ${concern}`).join('\n')}

💼 IMPACTO EN EL NEGOCIO:
${executiveSummary.business_impact}

🔧 RECOMENDACIONES INMEDIATAS:
${recommendations.immediate_actions.map(action => 
  `• [${action.priority.toUpperCase()}] ${action.action}
    Impacto: ${action.impact}`
).join('\n')}

👤 MEJORAS POR TIPO DE USUARIO:
${recommendations.personalization_improvements.map(improvement => 
  `• ${improvement.persona}: ${improvement.recommendation}`
).join('\n')}

🎁 OPTIMIZACIÓN DE PROMOCIONES:
${recommendations.promotion_optimization.map(opt => 
  `• Problema: ${opt.issue}
    Solución: ${opt.solution}`
).join('\n')}

⚙️ MEJORAS TÉCNICAS:
${recommendations.technical_improvements.map(tech => 
  `• ${tech.area}: ${tech.improvement}`
).join('\n')}

🇲🇽 AJUSTES CULTURALES:
${recommendations.cultural_adjustments.map(cultural => 
  `• ${cultural.aspect}: ${cultural.adjustment}`
).join('\n')}

🚀 PRÓXIMOS PASOS:
${executiveSummary.next_steps.map(step => `• ${step}`).join('\n')}

📅 Reporte generado: ${reportData.timestamp.toLocaleString('es-MX')}
🤖 Sistema: PALOMA TESTER v1.0

===============================================
¡Gracias por usar el sistema de evaluación automatizada de Cinépolis! 🎬🍿
    `.trim();

    return report;
  }

  formatScoreLabel(key) {
    const labels = {
      'relevancia': 'Relevancia',
      'personalizacion': 'Personalización',
      'informacion_promocional': 'Info. Promocional',
      'claridad_lenguaje': 'Claridad del Lenguaje',
      'call_to_action': 'Call to Action',
      'empatia_cultural': 'Empatía Cultural'
    };
    return labels[key] || key;
  }

  getStarRating(score) {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '⭐'.repeat(fullStars) + 
           (hasHalfStar ? '⭐' : '') + 
           '☆'.repeat(emptyStars);
  }

  // Generate individual persona report
  generatePersonaReport(personaResult) {
    const persona = personaResult.persona;
    const analysis = personaResult.analysis;
    
    return `
🎭 REPORTE INDIVIDUAL - ${persona.toUpperCase()}
==========================================

📊 ESTADÍSTICAS:
- Preguntas enviadas: ${personaResult.questions}
- Respuestas recibidas: ${personaResult.successfulResponses}
- Códigos QR obtenidos: ${personaResult.qrReceived}
- Tiempo promedio de respuesta: ${(personaResult.averageResponseTime || 0).toFixed(1)}s

🎯 ANÁLISIS DE DESEMPEÑO:
- Satisfacción del usuario: ${analysis?.overallAnalysis?.persona_satisfaction || 'N/A'}/5
- Efectividad del bot: ${analysis?.overallAnalysis?.bot_effectiveness || 'N/A'}/5
- Targeting de promociones: ${analysis?.overallAnalysis?.promotion_targeting || 'N/A'}/5
- Apropiación cultural: ${analysis?.overallAnalysis?.cultural_appropriateness || 'N/A'}/5

🏆 FORTALEZAS PRINCIPALES:
${analysis?.overallAnalysis?.key_strengths?.map(s => `• ${s}`).join('\n') || '• Análisis no disponible'}

⚠️ ÁREAS DE MEJORA:
${analysis?.overallAnalysis?.key_weaknesses?.map(w => `• ${w}`).join('\n') || '• Análisis no disponible'}

💡 RECOMENDACIONES ESPECÍFICAS:
${analysis?.overallAnalysis?.recommendations?.map(r => `• ${r}`).join('\n') || '• Análisis no disponible'}

📋 CALIFICACIÓN FINAL: ${analysis?.overallAnalysis?.overall_grade || 'N/A'}

📝 RESUMEN:
${analysis?.overallAnalysis?.summary || 'Resumen no disponible'}

==========================================
    `.trim();
  }
}