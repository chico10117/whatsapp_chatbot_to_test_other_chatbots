import fs from 'fs';
import path from 'path';
import CinepolisFeedbackGenerator from './src/cinepolis-feedback-generator.js';

async function generateReport() {
  console.log('📊 PALOMA REPORT GENERATOR');
  console.log('==========================\n');

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

    // Transform data to match expected format
    const results = testData.testResults.map(persona => ({
      persona: persona.personaName,
      demographic: persona.description,
      questions: persona.questions.length,
      successfulResponses: persona.questions.filter(q => q.response).length,
      qrReceived: persona.questions.filter(q => q.receivedQR).length,
      averageResponseTime: persona.questions.filter(q => q.responseTime)
        .reduce((sum, q) => sum + q.responseTime, 0) / 
        persona.questions.filter(q => q.responseTime).length || 0,
      responses: persona.questions
    }));

    // Generate the final report
    const feedbackGenerator = new CinepolisFeedbackGenerator();
    console.log('🤖 Generating comprehensive final report with AI...');
    
    const finalReport = await feedbackGenerator.generateFinalReport(results);
    
    // Save the report
    const reportFileName = `paloma_report_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    fs.writeFileSync(reportFileName, finalReport);
    
    console.log(`\n✅ Report generated successfully!`);
    console.log(`📄 Saved as: ${reportFileName}`);
    console.log(`\n📋 REPORT PREVIEW:`);
    console.log('='.repeat(50));
    console.log(finalReport.substring(0, 1000) + '...');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the report generation
generateReport();