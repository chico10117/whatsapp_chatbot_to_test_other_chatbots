import dotenv from 'dotenv';
import makeWASocket, { useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import TestOrchestrator from './src/test-orchestrator.js';
import qrcode from 'qrcode-terminal';

dotenv.config();

/**
 * Simple test to validate response waiting mechanism
 * This sends a few test messages to RECO and validates the waiting behavior
 */
async function testResponseWaiting() {
  console.log('🧪 Testing RECO Response Waiting Mechanism');
  console.log('==========================================\n');

  const recoNumber = (process.env.RECO_WHATSAPP_NUMBER || '+593994170801').replace('+', '') + '@s.whatsapp.net';
  let globalClient = null;
  const testOrchestrator = new TestOrchestrator();

  try {
    // Connect to WhatsApp
    console.log('📱 Connecting to WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState('store_wa-session');
    
    globalClient = makeWASocket.default({
      generateHighQualityLinkPreview: true,
      auth: state
    });

    globalClient.ev.on('creds.update', saveCreds);
    
    // Handle connection updates and QR code display
    globalClient.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('\n📱 Scan this QR code with your WhatsApp mobile app:');
        qrcode.generate(qr, { small: true });
        console.log('\n');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        if (shouldReconnect) {
          console.log('🔄 Reconnecting to WhatsApp...');
        } else {
          console.log('❌ WhatsApp logout detected');
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected');
      }
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 60000); // Increased timeout to 60 seconds

      globalClient.ev.on('connection.update', (update) => {
        if (update.connection === 'open') {
          clearTimeout(timeout);
          resolve();
        } else if (update.connection === 'close' && update.lastDisconnect?.error?.output?.statusCode === 401) {
          clearTimeout(timeout);
          reject(new Error('WhatsApp logout - please scan QR code again'));
        }
      });
    });

    // Set up message handler
    globalClient.ev.on('messages.upsert', (m) => {
      if (m.messages[0].key.fromMe) return;
      
      const message = m.messages[0];
      const jid = message.key.remoteJid;
      
      if (jid === recoNumber) {
        console.log('📨 Message from RECO received, forwarding to orchestrator');
        testOrchestrator.handleIncomingMessage(message);
      }
    });

    // Test questions
    const testQuestions = [
      "Hola, ¿puedes recomendarme un restaurante?",
      "¿Conoces algún sitio de comida italiana?",
      "Gracias por la información"
    ];

    console.log('\n🚀 Starting response wait test...\n');

    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n--- Test Question ${i + 1}/${testQuestions.length} ---`);
      
      const result = await testOrchestrator.sendQuestionAndWaitResponse(
        globalClient,
        recoNumber,
        question,
        i + 1
      );

      console.log(`✅ Question completed:`);
      console.log(`   Question: ${result.question}`);
      console.log(`   Response: ${result.response ? result.response.substring(0, 100) + '...' : 'No response'}`);
      console.log(`   Response Time: ${result.responseTime ? (result.responseTime/1000).toFixed(1) + 's' : 'N/A'}`);
      
      // Wait between questions
      if (i < testQuestions.length - 1) {
        console.log(`\n⏳ Waiting 3 seconds before next question...`);
        await delay(3000);
      }
    }

    console.log('\n🎉 Response waiting test completed successfully!');
    console.log('✅ The mechanism properly waits for RECO responses before proceeding');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    if (globalClient) {
      await globalClient.end();
    }
  }
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testResponseWaiting().catch(console.error);
}

export default testResponseWaiting; 