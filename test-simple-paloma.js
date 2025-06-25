import dotenv from 'dotenv';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

dotenv.config();

class SimplePalomaTest {
  constructor() {
    this.palomaNumber = '34624330565@s.whatsapp.net';
    this.globalClient = null;
  }

  async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('store_wa-session-simple-paloma');

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
          resolve();
        }
      });
    });
  }

  async sendTestMessage() {
    try {
      console.log(`📤 Sending test message to ${this.palomaNumber}`);
      
      await this.globalClient.sendMessage(this.palomaNumber, { 
        text: '¡Hola! Soy Luis, un estudiante universitario. ¿Qué promociones tienen disponibles?' 
      });
      
      console.log('✅ Test message sent successfully');
      
      // Listen for responses
      this.globalClient.ev.on('messages.upsert', (update) => {
        const message = update.messages?.[0];
        if (message && message.key.remoteJid === this.palomaNumber) {
          console.log('📥 Received response from Paloma bot:');
          console.log('Text:', message.message?.conversation || message.message?.extendedTextMessage?.text || '[Non-text message]');
          
          if (message.message?.imageMessage) {
            console.log('🖼️ Image received (possibly QR code)');
            console.log('Caption:', message.message.imageMessage.caption || 'No caption');
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error sending test message:', error);
    }
  }
}

async function main() {
  const tester = new SimplePalomaTest();
  
  try {
    console.log('🧪 Simple Paloma Test - Connecting to WhatsApp...');
    await tester.connectToWhatsApp();
    
    console.log('⏳ Waiting 3 seconds before sending test message...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await tester.sendTestMessage();
    
    console.log('🎯 Test message sent. Listening for responses...');
    console.log('Press Ctrl+C to exit');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();