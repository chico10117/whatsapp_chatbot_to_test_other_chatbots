import dotenv from 'dotenv';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import TestOrchestrator from './src/test-orchestrator.js';
import ResponseAnalyzer from './src/response-analyzer.js';
import FeedbackGenerator from './src/feedback-generator.js';
import TestLogger from './src/test-logger.js';
import qrcode from 'qrcode-terminal';

dotenv.config();

class BottyTester {
  constructor() {
    this.recoNumber = (process.env.RECO_WHATSAPP_NUMBER || '+593994170801').replace('+', '') + '@s.whatsapp.net';
    this.globalClient = null;
    this.testOrchestrator = new TestOrchestrator();
    this.responseAnalyzer = new ResponseAnalyzer();
    this.feedbackGenerator = new FeedbackGenerator();
    this.logger = new TestLogger();
    this.testStartTime = null;
    this.isTestRunning = false;
  }

  async initialize() {
    console.log('🤖 BOTTY - WhatsApp Bot Tester for RECO');
    console.log('=====================================\n');

    try {
      // Validate environment variables
      this.validateEnvironment();

      // Initialize WhatsApp connection
      console.log('📱 Initializing WhatsApp connection...');
      await this.connectToWhatsApp();

      console.log('✅ BOTTY initialized successfully');
      console.log(`🎯 Target: ${this.recoNumber}`);
      console.log('📝 Ready to test 5 AI-powered personas with dynamic conversations\n');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize BOTTY:', error.message);
      throw error;
    }
  }

  validateEnvironment() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    console.log('✅ Environment variables validated');
  }

  async clearSession() {
    try {
      const fs = await import('fs/promises');
      await fs.rm('store_wa-session', { recursive: true, force: true });
      console.log('🗑️  WhatsApp session cleared');
    } catch (error) {
      console.log('ℹ️  No existing session to clear');
    }
  }

  async connectToWhatsApp(retryCount = 0) {
    const maxRetries = 2;
    
    try {
      const { state, saveCreds } = await useMultiFileAuthState('store_wa-session');

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
      
      // Handle sync errors gracefully
      this.globalClient.ev.on('CB:call', (data) => {
        console.log('📞 Call event (ignored):', data);
      });
      
      // Suppress excessive sync error logs
      this.globalClient.ev.on('CB:chatstate-sync', (data) => {
        // Silently handle chat state sync
      });
    
    } catch (error) {
      console.error('❌ Error setting up WhatsApp client:', error.message);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying connection (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        await this.clearSession();
        await delay(3000);
        return this.connectToWhatsApp(retryCount + 1);
      }
      
      throw error;
    }

    // Set up message handler
    this.globalClient.ev.on('messages.upsert', (m) => {
      if (m.messages[0].key.fromMe) return;
      
      const message = m.messages[0];
      const jid = message.key.remoteJid;
      const pushName = message.pushName || 'Unknown';
      
      if (this.isTestRunning) {
        console.log(`📨 Incoming message from: ${pushName} (${jid})`);
        
        if (jid === this.recoNumber) {
          console.log(`✅ Message from RECO detected, forwarding to test orchestrator`);
          this.testOrchestrator.handleIncomingMessage(message);
        } else {
          console.log(`ℹ️  Message from ${pushName} ignored (not RECO)`);
        }
      }
    });

    return new Promise((resolve, reject) => {
      // Increased timeout to 5 minutes for slow connections
      const timeout = setTimeout(() => {
        reject(new Error('WhatsApp connection timeout - please try again'));
      }, 300000);

      let isResolved = false;
      let connectionReady = false;

      const handleConnection = async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('\n📱 Scan this QR code with your WhatsApp mobile app:');
          qrcode.generate(qr, { small: true });
          console.log('\n⏳ Waiting for QR scan...');
        }

        if (connection === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
        } else if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully');
          connectionReady = true;
          
          // Give some time for initial sync, then resolve
          if (!isResolved) {
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                this.globalClient.ev.off('connection.update', handleConnection);
                console.log('🎯 WhatsApp ready for testing!');
                resolve();
              }
            }, 5000); // Reduced wait time
          }
        } else if (connection === 'close') {
          if (lastDisconnect?.error?.output?.statusCode === 401) {
            isResolved = true;
            clearTimeout(timeout);
            this.globalClient.ev.off('connection.update', handleConnection);
            reject(new Error('WhatsApp logout - please scan QR code again'));
          } else if (!connectionReady) {
            // Only reconnect if we haven't had a successful connection yet
            console.log('🔄 Connection lost, reconnecting...');
            await delay(2000);
            await this.connectToWhatsApp();
          }
        }
      };

      this.globalClient.ev.on('connection.update', handleConnection);
    });
  }

  async startTesting() {
    if (this.isTestRunning) {
      console.log('⚠️  Test is already running');
      return;
    }

    try {
      this.isTestRunning = true;
      this.testStartTime = Date.now();

      console.log('\n🚀 Starting BOTTY test sequence...');
      console.log('===================================');

      const testResults = await this.testOrchestrator.executeAllPersonas(
        this.globalClient, 
        this.recoNumber
      );

      const analysisResults = await this.responseAnalyzer.analyzeAllTestResults(testResults);

      const finalReport = this.feedbackGenerator.generateFinalReport(testResults, analysisResults);

      await this.sendFinalReport(finalReport);

      await this.saveCompleteResults(testResults, analysisResults, finalReport);

      const totalDuration = Date.now() - this.testStartTime;
      console.log(`\n🎉 BOTTY test completed successfully in ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
      
      const summary = this.responseAnalyzer.generateQuickSummary(analysisResults);
      console.log('\n📊 QUICK SUMMARY:');
      console.log(`   Overall Grade: ${summary.overallGrade}`);
      console.log(`   Average Score: ${summary.averageScore.toFixed(1)}/5.0`);
      console.log(`   Response Rate: ${summary.averageResponseRate.toFixed(1)}%`);
      console.log(`   Personas Tested: ${summary.personasAnalyzed}`);

      return {
        testResults,
        analysisResults,
        finalReport,
        summary
      };

    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
      throw error;
    } finally {
      this.isTestRunning = false;
    }
  }

  async sendFinalReport(report) {
    try {
      const chunks = this.splitMessageForWhatsApp(report);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`   📤 Sending report chunk ${i + 1}/${chunks.length}...`);
        await this.globalClient.sendMessage(this.recoNumber, { text: chunks[i] });
        
        if (i < chunks.length - 1) {
          await delay(2000);
        }
      }
      
      console.log('✅ Final report sent to Reco successfully');
    } catch (error) {
      console.error('❌ Failed to send final report:', error.message);
      throw error;
    }
  }

  splitMessageForWhatsApp(text, maxLength = 4000) {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
        } else {
          chunks.push(line.substring(0, maxLength));
          currentChunk = line.substring(maxLength) + '\n';
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  async saveCompleteResults(testResults, analysisResults, finalReport) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const completeResults = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.testStartTime,
        testResults,
        analysisResults,
        finalReport,
        summary: this.responseAnalyzer.generateQuickSummary(analysisResults)
      };

      await this.logger.saveFullTestResults([completeResults]);
      console.log('💾 Complete test session saved');
    } catch (error) {
      console.error('⚠️  Failed to save complete results:', error.message);
    }
  }

  async sendTestMessage(message) {
    try {
      await this.globalClient.sendMessage(this.recoNumber, { text: message });
      console.log('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send test message:', error.message);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isTestRunning,
      startTime: this.testStartTime,
      orchestratorStatus: this.testOrchestrator.getCurrentStatus(),
      connected: !!this.globalClient
    };
  }

  async stop() {
    console.log('\n🛑 Stopping BOTTY...');
    this.isTestRunning = false;
    this.testOrchestrator.reset();
    
    if (this.globalClient) {
      await this.globalClient.end();
      this.globalClient = null;
    }
    
    console.log('✅ BOTTY stopped successfully');
  }
}

async function main() {
  const botty = new BottyTester();

  try {
    await botty.initialize();

    console.log('⏳ Starting test in 5 seconds...');
    await delay(5000);
    
    const results = await botty.startTesting();
    
    console.log('\n🎊 Test completed successfully!');
    console.log('📁 Check test-logs/ directory for detailed results');
    
  } catch (error) {
    console.error('\n💥 BOTTY execution failed:', error);
    process.exit(1);
  }

  console.log('\n⏸️  BOTTY finished. Press Ctrl+C to exit.');
  
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down BOTTY...');
    await botty.stop();
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BottyTester; 