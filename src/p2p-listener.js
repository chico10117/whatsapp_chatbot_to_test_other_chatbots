import baileys, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  delay
} from '@whiskeysockets/baileys';

const makeWASocket = baileys.default;
import pLimit from 'p-limit';
import qrcode from 'qrcode-terminal';
import { isSellOffer, analyzeSellOffer, extractAmount } from './sell-offer-detector.js';
import { buildReply, getResponseStats, validateResponse, getFallbackResponse } from './papibot-responder.js';

/**
 * P2P Listener - WhatsApp Integration for Papibot
 * Monitors P2P crypto group and responds to sell offers instantly
 */

export default class P2PListener {
  constructor() {
    this.socket = null;
    this.groupId = process.env.GROUP_ID || null;
    this.authState = process.env.WA_AUTH_STATE || 'papibot_auth_state';
    this.isConnected = false;
    this.messageCount = 0;
    this.responseCount = 0;
    this.startTime = Date.now();
    this.groupIdCaptured = false;
    
    // Rate limiting: maximum 1 send operation at a time
    this.sendLimiter = pLimit(1);
    
    // Target group identification
    this.targetGroupNames = [
      'COMERCIANTE VERIFICADO P2P🇨🇷',
      'COMERCIANTE VERIFICADO P2P',
      'P2P COMERCIANTE VERIFICADO',
      'COMERCIANTE P2P',
      'P2P 🇨🇷'
    ];
    
    // Statistics tracking
    this.stats = {
      messagesProcessed: 0,
      sellOffersDetected: 0,
      responsesSent: 0,
      errors: 0,
      avgResponseTime: 0,
      responseHistory: []
    };
  }

  /**
   * Initializes and starts the Papibot P2P listener
   */
  async startPapibot() {
    console.log('🤖 Initializing Papibot P2P Listener...');
    console.log(`🎯 Target Group: ${this.groupId || 'Will auto-capture'}`);
    
    // Auto-capture strategy: If no GROUP_ID, we'll capture it from first P2P message
    if (!this.groupId) {
      console.log('📡 GROUP_ID not configured - using auto-capture strategy');
      console.log('💡 Papibot will identify P2P group from first relevant message');
    }

    try {
      // Initialize WhatsApp connection
      await this.initializeWhatsApp();
      
      console.log('🚀 Papibot P2P Listener started successfully!');
      console.log('📱 Monitoring for sell offers in Costa Rican pachuco style...');
      
      if (this.groupId) {
        console.log(`💰 Target group: ${this.groupId}`);
      } else {
        console.log('💰 Will auto-detect P2P group from incoming messages');
        console.log('📝 Send a message in the P2P group to activate auto-capture');
      }
      
      return this.socket;
    } catch (error) {
      console.error('❌ Failed to start Papibot:', error);
      throw error;
    }
  }

  /**
   * Initializes WhatsApp connection using Baileys
   */
  async initializeWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authState);
    const { version } = await fetchLatestBaileysVersion();

    console.log('📞 Establishing WhatsApp connection...');

    this.socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
      browser: ['Papibot P2P', 'Desktop', '1.0.0'],
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: false // Stay discrete
    });

    // Handle credentials update
    this.socket.ev.on('creds.update', saveCreds);

    // Handle connection updates
    this.socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    // Handle incoming messages
    this.socket.ev.on('messages.upsert', async ({ messages }) => {
      await this.handleIncomingMessages(messages);
    });

    // Wait for connection to be established
    await this.waitForConnection();
  }

  /**
   * Handles WhatsApp connection state updates
   */
  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('📱 Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('📱 Connection closed due to:', lastDisconnect?.error);
      
      if (shouldReconnect) {
        console.log('🔄 Reconnecting to WhatsApp...');
        setTimeout(() => this.initializeWhatsApp(), 3000);
      } else {
        console.log('🚪 Logged out from WhatsApp');
        this.isConnected = false;
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp successfully');
      this.isConnected = true;
    }
  }

  /**
   * Waits for WhatsApp connection to be established
   */
  async waitForConnection() {
    console.log('⏳ Waiting for WhatsApp connection...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 60000);

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

  /**
   * Handles incoming WhatsApp messages
   */
  async handleIncomingMessages(messages) {
    for (const message of messages) {
      try {
        await this.processMessage(message);
      } catch (error) {
        console.error('❌ Error processing message:', error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Processes individual WhatsApp message
   */
  async processMessage(message) {
    // Skip if no message content
    if (!message.message) return;

    // Skip our own messages
    if (message.key.fromMe) return;

    // Only process group messages
    if (!message.key.remoteJid.endsWith('@g.us')) return;

    // Auto-capture GROUP_ID if not set
    if (!this.groupId && !this.groupIdCaptured) {
      const messageText = this.extractMessageText(message);
      if (await this.isTargetP2PGroup(message, messageText)) {
        await this.captureGroupId(message.key.remoteJid);
        return; // Return after capture, will process normally next time
      }
    }

    // Skip if not from target group (after potential auto-capture)
    if (this.groupId && message.key.remoteJid !== this.groupId) return;

    // Extract text content from different message types
    const messageText = this.extractMessageText(message);
    if (!messageText) return;

    // Update statistics
    this.stats.messagesProcessed++;
    console.log(`📨 [${new Date().toLocaleTimeString()}] Message #${this.stats.messagesProcessed}: ${messageText.substring(0, 50)}...`);

    // Analyze message for sell offer
    const analysisStartTime = Date.now();
    const analysis = analyzeSellOffer(messageText);
    
    if (analysis.isSellOffer) {
      this.stats.sellOffersDetected++;
      console.log(`🎯 [${new Date().toLocaleTimeString()}] SELL OFFER DETECTED! Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`💰 Details: ${JSON.stringify(analysis.matches)}`);
      
      // Extract amount if present
      const amountData = extractAmount(messageText);
      if (amountData) {
        console.log(`💵 Amount detected: ${amountData.amount} ${amountData.currency}`);
      }

      // Generate and send response
      await this.sendPapibotResponse(message, messageText, amountData, analysis);
    } else {
      console.log(`ℹ️  [${new Date().toLocaleTimeString()}] Not a sell offer (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Extracts text content from different WhatsApp message types
   */
  extractMessageText(message) {
    const msg = message.message;

    // Text message
    if (msg.conversation) {
      return msg.conversation;
    }

    // Extended text message (with links, formatting, etc.)
    if (msg.extendedTextMessage?.text) {
      return msg.extendedTextMessage.text;
    }

    // Image with caption
    if (msg.imageMessage?.caption) {
      return msg.imageMessage.caption;
    }

    // Video with caption
    if (msg.videoMessage?.caption) {
      return msg.videoMessage.caption;
    }

    // Document with caption
    if (msg.documentMessage?.caption) {
      return msg.documentMessage.caption;
    }

    // Button response
    if (msg.buttonsResponseMessage?.selectedDisplayText) {
      return msg.buttonsResponseMessage.selectedDisplayText;
    }

    // List response
    if (msg.listResponseMessage?.title) {
      return msg.listResponseMessage.title;
    }

    return null;
  }

  /**
   * Generates and sends Papibot response to sell offer
   */
  async sendPapibotResponse(originalMessage, messageText, amountData, analysis) {
    const responseStartTime = Date.now();

    try {
      // Generate response using papibot responder
      let response = buildReply({
        originalMessage: messageText,
        amountData,
        addIntensifier: analysis.confidence > 0.8 // More excited for high-confidence offers
      });

      if (!response) {
        console.log('🚫 Response blocked by rate limiter');
        return;
      }

      // Validate response quality
      if (!validateResponse(response)) {
        console.warn('⚠️  Generated response failed validation, using fallback');
        response = getFallbackResponse();
      }

      // Send response with rate limiting
      await this.sendLimiter(async () => {
        await this.socket.sendMessage(
          this.groupId,
          { text: response },
          { quoted: originalMessage }
        );
      });

      // Calculate response time
      const responseTime = Date.now() - responseStartTime;
      this.updateResponseStats(responseTime);

      console.log(`🎯 [${new Date().toLocaleTimeString()}] RESPONDED in ${responseTime}ms: "${response}"`);
      console.log(`📊 Stats: ${this.stats.responsesSent} responses sent, avg time: ${this.stats.avgResponseTime.toFixed(0)}ms`);

    } catch (error) {
      console.error('❌ Failed to send response:', error);
      this.stats.errors++;
      
      // Try fallback response if original failed
      try {
        await delay(1000); // Brief delay before retry
        await this.sendLimiter(async () => {
          await this.socket.sendMessage(
            this.groupId,
            { text: getFallbackResponse() },
            { quoted: originalMessage }
          );
        });
        console.log('✅ Sent fallback response successfully');
      } catch (fallbackError) {
        console.error('❌ Fallback response also failed:', fallbackError);
      }
    }
  }

  /**
   * Updates response time statistics
   */
  updateResponseStats(responseTime) {
    this.stats.responsesSent++;
    this.stats.responseHistory.push({
      timestamp: Date.now(),
      responseTime
    });

    // Keep only last 100 responses for average calculation
    if (this.stats.responseHistory.length > 100) {
      this.stats.responseHistory.shift();
    }

    // Calculate average response time
    const totalTime = this.stats.responseHistory.reduce((sum, record) => sum + record.responseTime, 0);
    this.stats.avgResponseTime = totalTime / this.stats.responseHistory.length;
  }

  /**
   * Gets current Papibot statistics
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const responderStats = getResponseStats();

    return {
      uptime: `${Math.floor(uptime / 1000 / 60)} minutes`,
      isConnected: this.isConnected,
      groupId: this.groupId,
      ...this.stats,
      responderStats,
      performance: {
        avgResponseTime: `${this.stats.avgResponseTime.toFixed(0)}ms`,
        successRate: `${((this.stats.responsesSent / Math.max(this.stats.sellOffersDetected, 1)) * 100).toFixed(1)}%`,
        detectionRate: `${((this.stats.sellOffersDetected / Math.max(this.stats.messagesProcessed, 1)) * 100).toFixed(1)}%`
      }
    };
  }

  /**
   * Gracefully stops the Papibot listener
   */
  async stop() {
    console.log('🛑 Stopping Papibot P2P Listener...');
    
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    
    this.isConnected = false;
    console.log('✅ Papibot stopped successfully');
  }

  /**
   * Auto-capture GROUP_ID from P2P group message
   */
  async isTargetP2PGroup(message, messageText) {
    try {
      // Get group metadata to check the group name
      const groupMetadata = await this.socket.groupMetadata(message.key.remoteJid);
      const groupName = groupMetadata.subject;
      
      console.log(`📱 [Auto-Capture] Checking group: "${groupName}"`);
      
      // Check if group name matches any of our target names
      const nameMatches = this.targetGroupNames.some(targetName => 
        groupName.includes(targetName) || 
        groupName.includes('COMERCIANTE') ||
        groupName.includes('P2P') ||
        groupName.includes('🇨🇷')
      );

      if (nameMatches) {
        console.log(`✅ [Auto-Capture] Group name matches P2P criteria: "${groupName}"`);
        return true;
      }

      // Check if the message content looks like P2P crypto content
      const messageMatches = this.isP2PContent(messageText);
      
      if (messageMatches) {
        console.log(`✅ [Auto-Capture] Message content looks like P2P crypto: "${messageText.substring(0, 50)}..."`);
        console.log(`📋 [Auto-Capture] In group: "${groupName}"`);
        return true;
      }

      return false;
      
    } catch (error) {
      console.log(`⚠️  [Auto-Capture] Could not get group metadata: ${error.message}`);
      
      // Fallback: check message content only
      return this.isP2PContent(messageText);
    }
  }

  /**
   * Check if message content looks like P2P crypto trading
   */
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

  /**
   * Capture and persist GROUP_ID
   */
  async captureGroupId(groupId) {
    this.groupId = groupId;
    this.groupIdCaptured = true;
    
    console.log('🎉 [Auto-Capture] SUCCESS! GROUP_ID CAPTURED!');
    console.log('==============================================');
    console.log(`📝 Group ID: ${groupId}`);
    console.log('');
    
    // Update .env file
    await this.updateEnvFile(groupId);
    
    console.log('✅ [Auto-Capture] GROUP_ID saved to .env file!');
    console.log('🚀 [Auto-Capture] Papibot now monitoring this group for sell offers');
    console.log('');
  }

  /**
   * Update .env file with captured GROUP_ID
   */
  async updateEnvFile(groupId) {
    try {
      const fs = await import('fs/promises');
      
      // Read current .env file
      let envContent = '';
      try {
        envContent = await fs.readFile('.env', 'utf-8');
      } catch (error) {
        // .env doesn't exist, create new content
        envContent = `# WhatsApp Group Configuration
# Auto-captured by Papibot

`;
      }

      // Check if GROUP_ID already exists
      if (envContent.includes('GROUP_ID=')) {
        // Replace existing GROUP_ID
        envContent = envContent.replace(/GROUP_ID=.*$/m, `GROUP_ID=${groupId}`);
        console.log('📝 [Auto-Capture] Updated existing GROUP_ID in .env file');
      } else {
        // Add GROUP_ID
        envContent += `
# Auto-captured Papibot P2P Group Configuration
GROUP_ID=${groupId}
`;
        console.log('📝 [Auto-Capture] Added GROUP_ID to .env file');
      }

      // Write updated .env file
      await fs.writeFile('.env', envContent);
      
    } catch (error) {
      console.warn('⚠️  [Auto-Capture] Could not update .env file automatically:', error.message);
      console.log('📝 Please manually add this line to your .env file:');
      console.log(`GROUP_ID=${groupId}`);
    }
  }
}