// Standalone analyzer for existing test logs
// - Loads the latest full test log (full_test_*.json) by default
// - Or takes a --file path to a specific log
// - Runs ResponseAnalyzer and prints/saves the final report

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import ResponseAnalyzer from '../src/response-analyzer.js';
import FeedbackGenerator from '../src/feedback-generator.js';

dotenv.config();

/**
 * Parse CLI args into a simple map
 */
function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, val] = arg.split('=');
      result[key.replace(/^--/, '')] = val ?? true;
    } else {
      // positional file arg
      if (!result.file) result.file = arg;
    }
  }
  return result;
}

async function findLatestFullTestLog(logsDir) {
  const files = await fs.readdir(logsDir);
  const candidates = files
    .filter((f) => f.startsWith('full_test_') && f.endsWith('.json'))
    .map((f) => ({ name: f, mtime: null }));
  if (candidates.length === 0) return null;
  const stats = await Promise.all(
    candidates.map(async (c) => ({ name: c.name, stat: await fs.stat(path.join(logsDir, c.name)) }))
  );
  stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return path.join(logsDir, stats[0].name);
}

async function loadAllTestResultsFromFile(filepath) {
  const raw = await fs.readFile(filepath, 'utf-8');
  const parsed = JSON.parse(raw);
  // If it is a full_test_* file created by TestLogger.saveFullTestResults, it will have testResults
  if (parsed && Array.isArray(parsed.testResults)) {
    return parsed.testResults;
  }
  // Otherwise assume it is already a personaResults array
  if (Array.isArray(parsed)) return parsed;
  throw new Error('Unsupported log format: expected { testResults: [...] } or an array of persona results');
}

async function saveReport(text) {
  const logsDir = path.join(process.cwd(), 'test-logs');
  await fs.mkdir(logsDir, { recursive: true });
  const filename = `analysis_report_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  await fs.writeFile(path.join(logsDir, filename), text, 'utf-8');
  return filename;
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const logsDir = path.join(process.cwd(), 'test-logs');

    let targetFile = args.file || args.path;
    if (!targetFile) {
      const latest = await findLatestFullTestLog(logsDir);
      if (!latest) {
        throw new Error('No full_test_*.json logs found. Provide --file test-logs/full_test_...json');
      }
      targetFile = latest;
    }

    // Resolve relative paths
    if (!path.isAbsolute(targetFile)) {
      targetFile = path.resolve(process.cwd(), targetFile);
    }

    console.log(`🔍 Loading log: ${targetFile}`);
    const allTestResults = await loadAllTestResultsFromFile(targetFile);

    const analyzer = new ResponseAnalyzer();
    const feedback = new FeedbackGenerator();

    console.log('🧮 Running analysis on loaded results...');
    const analysisResults = await analyzer.analyzeAllTestResults(allTestResults);

    console.log('📝 Generating final report...');
    const finalReport = feedback.generateFinalReport(allTestResults, analysisResults);

    console.log('\n========== FINAL REPORT ==========');
    console.log(finalReport);
    console.log('=================================\n');

    const saved = await saveReport(finalReport);
    console.log(`💾 Saved report to test-logs/${saved}`);
  } catch (err) {
    console.error('❌ Failed to analyze logs:', err.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}


