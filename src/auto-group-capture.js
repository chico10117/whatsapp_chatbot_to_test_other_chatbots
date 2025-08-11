import baileys, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';

const makeWASocket = baileys.default;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

/**
 * Auto Group Capture
 * Connects to WhatsApp and automatically captures the GROUP_ID 
 * from the first message received from the P2P group
 */

class AutoGroupCapture {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.authState = 'group_capture_auth_state';
    this.capturedGroupId = null;
    this.targetGroupNames = [
      'COMERCIANTE VERIFICADO P2P🇨🇷',
      'COMERCIANTE VERIFICADO P2P',
      'P2P COMERCIANTE VERIFICADO',
      'COMERCIANTE P2P',
      'P2P 🇨🇷'
    ];
  }

  async start() {
    console.log('🤖 Auto Group ID Capture for Papibot');
    console.log('====================================');
    console.log('🎯 Target Group: "COMERCIANTE VERIFICADO P2P🇨🇷"');
    console.log('📱 Strategy: Capture GROUP_ID from first received message');
    console.log('');

    try {
      await this.initializeWhatsApp();
      await this.waitForConnection();
      console.log('✅ Connected! Waiting for messages from P2P group...');
      console.log('💡 Send a message in the P2P group to capture its ID automatically');
      console.log('');
      
      // Keep running until we capture the group ID
      await this.waitForGroupCapture();
      
    } catch (error) {
      console.error('❌ Failed to capture Group ID:', error);
      process.exit(1);
    }
  }

  async initializeWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authState);
    const { version } = await fetchLatestBaileysVersion();

    console.log('📱 Initializing WhatsApp connection...');

    this.socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
      browser: ['Group Capture', 'Desktop', '1.0.0'],
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      markOnlineOnConnect: false
    });

    this.socket.ev.on('creds.update', saveCreds);
    this.socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    // Listen for incoming messages
    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      await this.handleIncomingMessages(messages);
    });
  }

  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR code with your WhatsApp:');
      console.log('(Make sure you\'re using the WhatsApp account that\'s in the P2P group)');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        setTimeout(() => this.initializeWhatsApp(), 3000);
      } else {
        console.log('🚪 Logged out from WhatsApp');
        process.exit(0);
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp successfully!');
      this.isConnected = true;
    }
  }

  async waitForConnection() {
    console.log('⏳ Waiting for WhatsApp connection...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 120000);

      const checkConnection = () => {
        if (this.isConnected) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };

      checkConnection();
    });
  }

  async handleIncomingMessages(messages) {
    for (const message of messages) {
      try {
        await this.processMessage(message);
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    }
  }

  async processMessage(message) {
    // Skip if no message content or if we already captured the group ID
    if (!message.message || this.capturedGroupId) return;

    // Skip our own messages
    if (message.key.fromMe) return;

    // Only process group messages
    if (!message.key.remoteJid.endsWith('@g.us')) return;

    // Extract text content
    const messageText = this.extractMessageText(message);
    if (!messageText) return;

    // Check if this could be from our target P2P group
    const isTargetGroup = await this.isTargetP2PGroup(message, messageText);
    
    if (isTargetGroup) {
      const groupId = message.key.remoteJid;
      console.log('🎯 P2P GROUP DETECTED!');
      console.log('========================');
      console.log(`📨 Message: "${messageText.substring(0, 50)}..."`);
      console.log(`🆔 Group ID: ${groupId}`);
      console.log(`👤 From: ${message.key.participant || 'Unknown'}`);
      console.log(`📅 Time: ${new Date().toLocaleString()}`);
      console.log('');
      
      await this.captureGroupId(groupId);
    }
  }

  extractMessageText(message) {
    const msg = message.message;

    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;

    return null;
  }

  async isTargetP2PGroup(message, messageText) {
    try {
      // Get group metadata to check the group name
      const groupMetadata = await this.socket.groupMetadata(message.key.remoteJid);
      const groupName = groupMetadata.subject;
      
      console.log(`📱 Checking group: "${groupName}"`);
      
      // Check if group name matches any of our target names
      const nameMatches = this.targetGroupNames.some(targetName => 
        groupName.includes(targetName) || 
        groupName.includes('COMERCIANTE') ||
        groupName.includes('P2P') ||
        groupName.includes('🇨🇷')
      );

      if (nameMatches) {
        console.log(`✅ Group name matches P2P criteria: "${groupName}"`);
        return true;
      }

      // Check if the message content looks like P2P crypto content
      const messageMatches = this.isP2PContent(messageText);
      
      if (messageMatches) {
        console.log(`✅ Message content looks like P2P crypto: "${messageText.substring(0, 50)}..."`);
        console.log(`📋 In group: "${groupName}"`);
        
        // Ask for confirmation if we're not sure about the group name
        if (!nameMatches) {
          console.log('⚠️  Group name doesn\'t exactly match, but content looks like P2P');
          console.log('💡 This might be the right group with a different name');
          return true; // Auto-capture anyway since content matches
        }
      }

      return false;
      
    } catch (error) {
      console.log(`⚠️  Could not get group metadata: ${error.message}`);
      
      // Fallback: check message content only
      return this.isP2PContent(messageText);
    }
  }

  isP2PContent(text) {
    if (!text) return false;

    const lowerText = text.toLowerCase();
    
    // P2P crypto indicators
    const cryptoTerms = ['usdt', 'btc', 'eth', 'bitcoin', 'tether', 'cripto', 'crypto'];
    const sellTerms = ['vendo', 'venta', 'liquido', 'oferta', 'dispongo', 'cambio'];
    const amounts = /\d{1,3}(\.\d{3})*(,\d+)?\s*(usd|usdt|eur|€|\$|₡)/i;
    
    const hasCrypto = cryptoTerms.some(term => lowerText.includes(term));
    const hasSell = sellTerms.some(term => lowerText.includes(term));
    const hasAmount = amounts.test(text);
    
    return (hasCrypto && hasSell) || (hasCrypto && hasAmount);
  }

  async captureGroupId(groupId) {
    this.capturedGroupId = groupId;
    
    console.log('🎉 SUCCESS! GROUP_ID CAPTURED!');
    console.log('==============================');
    console.log(`📝 Group ID: ${groupId}`);
    console.log('');
    
    // Update .env file
    await this.updateEnvFile(groupId);
    
    console.log('✅ GROUP_ID has been automatically saved to .env file!');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Test the system: npm test');
    console.log('2. Start Papibot: npm run papibot');
    console.log('');
    console.log('🤖 Papibot is now ready to respond with:');
    console.log('• "Aquí papibot, los compro"');
    console.log('• "Mae, ¡los jalo yo!"');
    console.log('• "¡Diay! Papibot los compra al toque"');
    console.log('');
    console.log('🇨🇷 ¡Pura vida! GROUP_ID captured successfully! 💰');
    
    // Exit gracefully
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }

  async updateEnvFile(groupId) {
    try {
      // Read current .env file
      let envContent = '';
      try {
        envContent = await fs.readFile('.env', 'utf-8');
      } catch (error) {
        // .env doesn't exist, create new content
        envContent = `# WhatsApp Group Configuration
# Auto-captured by Papibot Group Capture

`;
      }

      // Check if GROUP_ID already exists
      if (envContent.includes('GROUP_ID=')) {
        // Replace existing GROUP_ID
        envContent = envContent.replace(/GROUP_ID=.*$/m, `GROUP_ID=${groupId}`);
        console.log('📝 Updated existing GROUP_ID in .env file');
      } else {
        // Add GROUP_ID
        envContent += `
# Auto-captured Papibot P2P Group Configuration
GROUP_ID=${groupId}
`;
        console.log('📝 Added GROUP_ID to .env file');
      }

      // Write updated .env file
      await fs.writeFile('.env', envContent);
      
    } catch (error) {
      console.warn('⚠️  Could not update .env file automatically:', error.message);
      console.log('📝 Please manually add this line to your .env file:');
      console.log(`GROUP_ID=${groupId}`);
    }
  }

  async waitForGroupCapture() {
    return new Promise((resolve) => {
      const checkCapture = () => {
        if (this.capturedGroupId) {
          resolve();
        } else {
          setTimeout(checkCapture, 1000);
        }
      };
      
      checkCapture();
    });
  }
}

// Main execution
async function main() {
  console.log('🎯 AUTOMATIC GROUP_ID CAPTURE STRATEGY');
  console.log('======================================');
  console.log('');
  console.log('📋 HOW IT WORKS:');
  console.log('1. Connect to WhatsApp using Baileys');
  console.log('2. Listen for ANY message from groups');
  console.log('3. Identify P2P group by name/content');
  console.log('4. Auto-capture GROUP_ID from message.key.remoteJid');
  console.log('5. Save to .env file automatically');
  console.log('');
  console.log('💡 WHAT YOU NEED TO DO:');
  console.log('1. Scan QR code when prompted');
  console.log('2. Send ANY message in the P2P group (or wait for someone else to send one)');
  console.log('3. GROUP_ID will be captured automatically!');
  console.log('');
  console.log('🚀 Starting auto-capture...');
  console.log('');

  const capture = new AutoGroupCapture();
  await capture.start();
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Auto-capture cancelled');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Auto-capture terminated');
  process.exit(0);
});

// Run the capture
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});