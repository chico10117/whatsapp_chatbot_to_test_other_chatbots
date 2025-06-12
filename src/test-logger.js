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