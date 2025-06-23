import fs from 'fs';
import path from 'path';

function calculateResponseTimes() {
  console.log('📊 CALCULATING RESPONSE TIMES - JUNE 23, 2025');
  console.log('==============================================\n');

  try {
    // Find all files from June 23rd
    const testLogsDir = './test-logs';
    const files = fs.readdirSync(testLogsDir)
      .filter(file => file.includes('2025-06-23') && file.endsWith('.json'))
      .sort();

    console.log(`📁 Found ${files.length} test files from June 23rd:`);
    files.forEach(file => console.log(`   - ${file}`));
    console.log('');

    let allResponseTimes = [];
    let totalQuestions = 0;
    let totalResponses = 0;
    let fileStats = [];

    for (const file of files) {
      const filePath = path.join(testLogsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      let fileResponseTimes = [];
      let fileQuestions = 0;
      let fileResponses = 0;

      // Handle different file structures
      if (data.testResults) {
        // Full test file
        for (const persona of data.testResults) {
          if (persona.questions) {
            for (const question of persona.questions) {
              fileQuestions++;
              if (question.responseTime && question.responseTime > 0) {
                fileResponseTimes.push(question.responseTime);
                allResponseTimes.push(question.responseTime);
                fileResponses++;
              }
            }
          }
        }
      } else if (data.questions) {
        // Individual persona file
        for (const question of data.questions) {
          fileQuestions++;
          if (question.responseTime && question.responseTime > 0) {
            fileResponseTimes.push(question.responseTime);
            allResponseTimes.push(question.responseTime);
            fileResponses++;
          }
        }
      }

      const fileAvg = fileResponseTimes.length > 0 ? 
        fileResponseTimes.reduce((sum, time) => sum + time, 0) / fileResponseTimes.length : 0;

      fileStats.push({
        file,
        questions: fileQuestions,
        responses: fileResponses,
        avgTime: fileAvg,
        minTime: fileResponseTimes.length > 0 ? Math.min(...fileResponseTimes) : 0,
        maxTime: fileResponseTimes.length > 0 ? Math.max(...fileResponseTimes) : 0
      });

      totalQuestions += fileQuestions;
      totalResponses += fileResponses;
    }

    // Calculate overall statistics
    const overallAvg = allResponseTimes.length > 0 ? 
      allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length : 0;
    const minTime = allResponseTimes.length > 0 ? Math.min(...allResponseTimes) : 0;
    const maxTime = allResponseTimes.length > 0 ? Math.max(...allResponseTimes) : 0;

    // Calculate percentiles
    const sortedTimes = allResponseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;

    console.log('📊 OVERALL STATISTICS FOR JUNE 23, 2025:');
    console.log('========================================');
    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Total Responses: ${totalResponses}`);
    console.log(`Response Rate: ${((totalResponses / totalQuestions) * 100).toFixed(1)}%`);
    console.log(`\n⏱️  RESPONSE TIME ANALYSIS:`);
    console.log(`Average Response Time: ${(overallAvg / 1000).toFixed(2)} seconds`);
    console.log(`Fastest Response: ${(minTime / 1000).toFixed(2)} seconds`);
    console.log(`Slowest Response: ${(maxTime / 1000).toFixed(2)} seconds`);
    console.log(`Median (P50): ${(p50 / 1000).toFixed(2)} seconds`);
    console.log(`90th Percentile: ${(p90 / 1000).toFixed(2)} seconds`);
    console.log(`95th Percentile: ${(p95 / 1000).toFixed(2)} seconds`);

    console.log(`\n📁 FILE-BY-FILE BREAKDOWN:`);
    console.log('===========================');
    
    fileStats.forEach(stat => {
      console.log(`\n📄 ${stat.file}`);
      console.log(`   Questions: ${stat.questions}`);
      console.log(`   Responses: ${stat.responses}`);
      console.log(`   Avg Time: ${(stat.avgTime / 1000).toFixed(2)}s`);
      console.log(`   Range: ${(stat.minTime / 1000).toFixed(2)}s - ${(stat.maxTime / 1000).toFixed(2)}s`);
    });

    console.log(`\n🎯 KEY INSIGHTS:`);
    console.log('===============');
    if (overallAvg < 5000) {
      console.log('✅ Excellent response times (< 5 seconds average)');
    } else if (overallAvg < 10000) {
      console.log('✅ Good response times (5-10 seconds average)');
    } else {
      console.log('⚠️  Response times could be improved (> 10 seconds average)');
    }

    if (totalResponses === totalQuestions) {
      console.log('✅ Perfect response rate (100%)');
    }

    const consistency = (maxTime - minTime) / 1000;
    if (consistency < 10) {
      console.log('✅ Consistent response times (< 10s variation)');
    } else {
      console.log(`⚠️  Variable response times (${consistency.toFixed(1)}s variation)`);
    }

  } catch (error) {
    console.error('❌ Error calculating response times:', error.message);
  }
}

calculateResponseTimes();