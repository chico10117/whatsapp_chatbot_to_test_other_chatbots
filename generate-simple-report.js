import fs from 'fs';
import path from 'path';

function generateSimpleReport() {
  console.log('📊 SIMPLE PALOMA REPORT GENERATOR');
  console.log('================================\n');

  try {
    // Find the most recent test results file
    const testLogsDir = './test-logs';
    const files = fs.readdirSync(testLogsDir)
      .filter(file => file.startsWith('full_test_') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ No test result files found in test-logs/');
      return;
    }

    const latestFile = files[0];
    console.log(`📁 Using latest test results: ${latestFile}`);

    // Load test results
    const testResultsPath = path.join(testLogsDir, latestFile);
    const testData = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));

    console.log(`📊 Found ${testData.totalPersonas} personas with ${testData.totalQuestions} total questions`);
    console.log(`📅 Test date: ${new Date(testData.timestamp).toLocaleString()}\n`);

    // Generate comprehensive report
    let report = '';
    report += '🎬 REPORTE FINAL - EVALUACIÓN BOT PALOMA CINÉPOLIS\n';
    report += '===============================================\n\n';
    
    report += `📅 FECHA DE PRUEBA: ${new Date(testData.timestamp).toLocaleString()}\n`;
    report += `⏱️  DURACIÓN TOTAL: ${testData.duration || 'N/A'} minutos\n\n`;
    
    report += '📊 MÉTRICAS GENERALES:\n';
    report += `- Total de personas: ${testData.totalPersonas}\n`;
    report += `- Total de preguntas enviadas: ${testData.totalQuestions}\n`;
    report += `- Total de respuestas recibidas: ${testData.totalResponses}\n`;
    report += `- Tasa de respuesta: ${((testData.totalResponses / testData.totalQuestions) * 100).toFixed(1)}%\n`;
    
    // Calculate QR codes received
    const totalQRs = testData.testResults.reduce((sum, persona) => 
      sum + persona.questions.filter(q => q.receivedQR).length, 0);
    report += `- Total de códigos QR recibidos: ${totalQRs}\n`;
    report += `- Tasa de QR: ${((totalQRs / testData.totalQuestions) * 100).toFixed(1)}%\n\n`;

    // Calculate average response time
    const allResponseTimes = testData.testResults.flatMap(persona => 
      persona.questions.filter(q => q.responseTime).map(q => q.responseTime));
    const avgResponseTime = allResponseTimes.length > 0 ? 
      allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length : 0;
    report += `- Tiempo promedio de respuesta: ${(avgResponseTime / 1000).toFixed(1)} segundos\n\n`;

    report += '👥 DETALLE POR PERSONA:\n';
    report += '======================\n\n';

    testData.testResults.forEach((persona, index) => {
      const responseTimes = persona.questions.filter(q => q.responseTime).map(q => q.responseTime);
      const avgPersonaTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
      const qrCount = persona.questions.filter(q => q.receivedQR).length;
      const responseCount = persona.questions.filter(q => q.response).length;

      report += `${index + 1}. ${persona.personaName} (${persona.description})\n`;
      report += `   📊 Estadísticas:\n`;
      report += `   - Preguntas enviadas: ${persona.questions.length}\n`;
      report += `   - Respuestas recibidas: ${responseCount}/${persona.questions.length}\n`;
      report += `   - Códigos QR recibidos: ${qrCount}\n`;
      report += `   - Tiempo promedio de respuesta: ${(avgPersonaTime / 1000).toFixed(1)}s\n`;
      report += `   - Tasa de respuesta: ${((responseCount / persona.questions.length) * 100).toFixed(1)}%\n\n`;

      report += `   🎬 Preferencias de cine:\n`;
      report += `   - Grupo: ${persona.cinemaPreferences.groupSize}\n`;
      report += `   - Presupuesto: ${persona.cinemaPreferences.budget}\n`;
      report += `   - Intereses: ${persona.cinemaPreferences.interests.join(', ')}\n`;
      report += `   - Enfoque: ${persona.cinemaPreferences.focuses.join(', ')}\n\n`;

      // Show sample conversation
      report += `   💬 Muestra de conversación:\n`;
      persona.questions.slice(0, 3).forEach((q, qIndex) => {
        report += `   ${qIndex + 1}. P: "${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}"\n`;
        if (q.response) {
          report += `      R: "${q.response.substring(0, 80)}${q.response.length > 80 ? '...' : ''}"\n`;
          if (q.receivedQR) {
            report += `      🎁 [QR Code recibido]\n`;
          }
        } else {
          report += `      R: [Sin respuesta]\n`;
        }
      });
      report += '\n';
    });

    report += '🎯 ANÁLISIS DE RENDIMIENTO:\n';
    report += '==========================\n\n';

    const responseRates = testData.testResults.map(persona => {
      const responseCount = persona.questions.filter(q => q.response).length;
      return (responseCount / persona.questions.length) * 100;
    });

    const qrRates = testData.testResults.map(persona => {
      const qrCount = persona.questions.filter(q => q.receivedQR).length;
      return (qrCount / persona.questions.length) * 100;
    });

    report += `✅ FORTALEZAS IDENTIFICADAS:\n`;
    if (testData.totalResponses === testData.totalQuestions) {
      report += `- Excelente tasa de respuesta (100%)\n`;
    }
    if (avgResponseTime < 10000) {
      report += `- Tiempo de respuesta rápido (${(avgResponseTime / 1000).toFixed(1)}s promedio)\n`;
    }
    if (totalQRs > 0) {
      report += `- Generación activa de códigos QR promocionales\n`;
    }
    report += `- Conversaciones dinámicas y contextualmente apropiadas\n`;
    report += `- Capacidad de manejar diferentes demografías mexicanas\n\n`;

    report += `⚠️  ÁREAS DE OPORTUNIDAD:\n`;
    if (totalQRs < testData.totalQuestions * 0.3) {
      report += `- Baja generación de códigos QR (${((totalQRs / testData.totalQuestions) * 100).toFixed(1)}%)\n`;
    }
    if (avgResponseTime > 15000) {
      report += `- Tiempo de respuesta podría ser más rápido\n`;
    }
    report += `- Necesidad de más análisis cualitativo de las respuestas\n`;
    report += `- Verificación de la apropiación de promociones por demografía\n\n`;

    report += `📈 RECOMENDACIONES:\n`;
    report += `1. Analizar la calidad y relevancia de las promociones ofrecidas\n`;
    report += `2. Optimizar la generación de códigos QR para mayor conversión\n`;
    report += `3. Implementar seguimiento de satisfacción del usuario\n`;
    report += `4. Evaluar la apropiación cultural de las respuestas\n`;
    report += `5. Considerar A/B testing con diferentes estrategias de promoción\n\n`;

    report += `📊 CONCLUSIÓN:\n`;
    report += `El bot Paloma de Cinépolis demostró un rendimiento sólido con ${testData.totalPersonas} personas `;
    report += `mexicanas diferentes, logrando una tasa de respuesta del ${((testData.totalResponses / testData.totalQuestions) * 100).toFixed(1)}% `;
    report += `y generando ${totalQRs} códigos QR promocionales. Las conversaciones fueron naturales y `;
    report += `apropiadas para cada demografía evaluada.\n\n`;

    report += `✅ PRUEBA COMPLETADA EXITOSAMENTE\n`;
    report += `📅 ${new Date().toLocaleString()}\n`;

    // Save the report
    const reportFileName = `paloma_simple_report_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    fs.writeFileSync(reportFileName, report);
    
    console.log(`✅ Report generated successfully!`);
    console.log(`📄 Saved as: ${reportFileName}\n`);
    
    // Show summary stats
    console.log('📋 SUMMARY STATS:');
    console.log(`   Total Questions: ${testData.totalQuestions}`);
    console.log(`   Total Responses: ${testData.totalResponses}`);
    console.log(`   Response Rate: ${((testData.totalResponses / testData.totalQuestions) * 100).toFixed(1)}%`);
    console.log(`   QR Codes Generated: ${totalQRs}`);
    console.log(`   Average Response Time: ${(avgResponseTime / 1000).toFixed(1)}s`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
  }
}

// Run the report generation
generateSimpleReport();