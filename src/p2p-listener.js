import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  delay
} from '@whiskeysockets/baileys';
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
    
    // Rate limiting: maximum 1 send operation at a time
    this.sendLimiter = pLimit(1);
    
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
    console.log(`🎯 Target Group: ${this.groupId || 'Not configured'}`);
    
    if (!this.groupId) {
      throw new Error('GROUP_ID environment variable is required');
    }

    try {
      // Initialize WhatsApp connection
      await this.initializeWhatsApp();
      
      console.log('🚀 Papibot P2P Listener started successfully!');
      console.log('📱 Monitoring for sell offers in Costa Rican pachuco style...');
      console.log(`💰 Target group: ${this.groupId}`);
      
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

    // Skip if not from target group
    if (message.key.remoteJid !== this.groupId) return;

    // Skip our own messages
    if (message.key.fromMe) return;

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
      const response = buildReply({
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
}