import dotenv from 'dotenv';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import CinepolisAIOrchestrator from './src/cinepolis-ai-orchestrator.js';
import CinepolisResponseAnalyzer from './src/cinepolis-response-analyzer.js';
import CinepolisFeedbackGenerator from './src/cinepolis-feedback-generator.js';
import TestLogger from './src/test-logger.js';
import qrcode from 'qrcode-terminal';

dotenv.config();

class PalomaTester {
  constructor() {
    this.palomaNumber = process.env.PALOMA_WHATSAPP_NUMBER || '34624330565@s.whatsapp.net';
    this.globalClient = null;
    this.testOrchestrator = new CinepolisAIOrchestrator();
    this.responseAnalyzer = new CinepolisResponseAnalyzer();
    this.feedbackGenerator = new CinepolisFeedbackGenerator();
    this.logger = new TestLogger();
    this.testStartTime = null;
    this.isTestRunning = false;
  }

  async initialize() {
    console.log('🎬 PALOMA TESTER - WhatsApp Bot Tester for Cinépolis');
    console.log('====================================================\n');

    try {
      // Validate environment variables
      this.validateEnvironment();

      // Initialize WhatsApp connection
      console.log('📱 Initializing WhatsApp connection...');
      await this.connectToWhatsApp();

      console.log('✅ PALOMA TESTER initialized successfully');
      console.log(`🎯 Target: ${this.palomaNumber}`);
      console.log('📝 Ready to test 5 AI-powered Mexican personas with dynamic cinema conversations\n');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize PALOMA TESTER:', error.message);
      throw error;
    }
  }

  validateEnvironment() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    console.log('✅ Environment variables validated');
  }

  async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('store_wa-session-paloma-tester');

    this.globalClient = makeWASocket.default({
      generateHighQualityLinkPreview: true,
      auth: state,
      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      printQRInTerminal: false
    });

    this.globalClient.ev.on('creds.update', saveCreds);

    return new Promise((resolve, reject) => {
      this.globalClient.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('📱 Scan this QR code with WhatsApp to connect:\n');
          qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
          
          if (shouldReconnect) {
            this.connectToWhatsApp();
          } else {
            reject(new Error('WhatsApp connection failed'));
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp connection established');
          console.log('🔗 Connected to WhatsApp successfully!');
          console.log('⏳ Waiting 5 seconds for connection to stabilize...');
          setTimeout(() => {
            resolve();
          }, 5000);
        }
      });
    });
  }

  async runFullTest() {
    if (this.isTestRunning) {
      console.log('⚠️  Test already running, please wait...');
      return;
    }

    this.isTestRunning = true;
    this.testStartTime = new Date();
    const testSessionId = `paloma_test_${Date.now()}`;

    console.log(`🚀 Starting PALOMA TESTER session: ${testSessionId}`);
    console.log(`⏰ Start time: ${this.testStartTime.toLocaleString()}\n`);

    try {
      // Set up message handler for the orchestrator
      this.globalClient.ev.on('messages.upsert', (update) => {
        const message = update.messages?.[0];
        if (message && message.key.remoteJid === this.palomaNumber) {
          // Only process messages FROM the Cinépolis bot (not our own messages)
          if (!message.key.fromMe) {
            console.log(`   📥 Incoming message FROM Cinépolis bot detected`);
            this.testOrchestrator.handleIncomingMessage(message);
          } else {
            console.log(`   📤 Our outgoing message sent to Cinépolis bot (ignoring)`);
          }
        }
      });

      // Execute AI-powered test with all personas
      console.log('🤖 Starting AI-powered conversations with all personas...');
      const allResults = await this.testOrchestrator.executeAllPersonas(this.globalClient, this.palomaNumber);

      // Generate comprehensive analysis
      console.log('\n📊 Analyzing all test results...');
      const finalAnalysis = await this.feedbackGenerator.generateFinalReport(allResults);
      
      // Send final report to Paloma bot
      console.log('📤 Sending final report to Paloma bot...');
      await this.sendFinalReport(finalAnalysis);

      // Save complete test session
      const completeResults = {
        testSessionId,
        startTime: this.testStartTime,
        endTime: new Date(),
        personas: allResults,
        finalAnalysis,
        testType: 'AI_GENERATED_CINEMA'
      };

      await this.logger.saveResults(completeResults, `full_paloma_test_${Date.now()}.json`);

      console.log('\n🎉 PALOMA TESTER completed successfully!');
      console.log(`📁 Results saved in test-logs/`);
      console.log(`🤖 All conversations were AI-generated dynamically`);
      
      return completeResults;
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    } finally {
      this.isTestRunning = false;
    }
  }


  async sendFinalReport(report) {
    try {
      await this.globalClient.sendMessage(this.palomaNumber, { text: report });
      console.log('✅ Final report sent successfully');
    } catch (error) {
      console.error('❌ Failed to send final report:', error);
    }
  }
}

// Main execution
async function main() {
  const tester = new PalomaTester();
  
  try {
    await tester.initialize();
    await tester.runFullTest();
  } catch (error) {
    console.error('❌ PALOMA TESTER failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PalomaTester;