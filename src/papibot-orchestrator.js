import dotenv from 'dotenv';
import P2PListener from './p2p-listener.js';

// Load environment variables
dotenv.config();

/**
 * Papibot Orchestrator - Main runtime controller
 * Coordinates the P2P crypto offer response system for Costa Rican WhatsApp group
 */

class PapibotOrchestrator {
  constructor() {
    this.listener = null;
    this.isRunning = false;
    this.startTime = null;
    this.errorCount = 0;
    this.restartCount = 0;
    
    // Configuration validation
    this.config = {
      groupId: process.env.GROUP_ID,
      authState: process.env.WA_AUTH_STATE || 'papibot_auth_state',
      logLevel: process.env.LOG_LEVEL || 'info',
      autoRestart: process.env.AUTO_RESTART !== 'false',
      maxRestarts: parseInt(process.env.MAX_RESTARTS) || 5,
      restartDelay: parseInt(process.env.RESTART_DELAY) || 30000 // 30 seconds
    };

    this.validateConfiguration();
  }

  /**
   * Validates required configuration
   */
  validateConfiguration() {
    // GROUP_ID is now optional - will be auto-captured if not provided
    
    console.log('✅ Configuration validated');
    console.log(`🎯 Target Group: ${this.config.groupId || 'Will auto-capture from P2P messages'}`);
    console.log(`📁 Auth State: ${this.config.authState}`);
    console.log(`🔄 Auto Restart: ${this.config.autoRestart ? 'Enabled' : 'Disabled'}`);
    
    if (!this.config.groupId) {
      console.log('📡 Auto-Capture Mode: Enabled');
      console.log('💡 GROUP_ID will be captured from first P2P message received');
    }
  }

  /**
   * Starts the Papibot system
   */
  async start() {
    try {
      console.log('🚀 Starting Papibot Orchestrator...');
      console.log('💰 P2P Crypto Offer Response System');
      console.log('🇨🇷 Costa Rican Pachuco Style Bot');
      console.log('=====================================');
      
      this.startTime = new Date();
      this.isRunning = true;

      // Initialize P2P listener
      this.listener = new P2PListener();
      
      // Setup signal handlers for graceful shutdown
      this.setupSignalHandlers();
      
      // Start monitoring
      await this.listener.startPapibot();
      
      console.log('✅ Papibot system started successfully!');
      console.log('📱 Monitoring WhatsApp group for crypto sell offers...');
      console.log('⚡ Target response time: <1 second');
      console.log('🎯 Ready to respond with "Aquí papibot, los compro" and variations');
      
      // Start status monitoring
      this.startStatusMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to start Papibot system:', error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Sets up graceful shutdown signal handlers
   */
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        await this.stop();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.handleError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.handleError(new Error(`Unhandled rejection: ${reason}`));
    });
  }

  /**
   * Starts periodic status monitoring and reporting
   */
  startStatusMonitoring() {
    setInterval(() => {
      if (this.isRunning && this.listener) {
        const stats = this.listener.getStats();
        this.logStatus(stats);
      }
    }, 60000); // Log status every minute

    // Log detailed stats every 10 minutes
    setInterval(() => {
      if (this.isRunning && this.listener) {
        const stats = this.listener.getStats();
        this.logDetailedStatus(stats);
      }
    }, 600000);
  }

  /**
   * Logs current system status
   */
  logStatus(stats) {
    console.log(`\n📊 [${new Date().toLocaleTimeString()}] Papibot Status Report:`);
    console.log(`   🔗 Connected: ${stats.isConnected ? '✅' : '❌'}`);
    console.log(`   📨 Messages Processed: ${stats.messagesProcessed}`);
    console.log(`   🎯 Sell Offers Detected: ${stats.sellOffersDetected}`);
    console.log(`   💬 Responses Sent: ${stats.responsesSent}`);
    console.log(`   ⚡ Avg Response Time: ${stats.performance.avgResponseTime}`);
    console.log(`   📈 Success Rate: ${stats.performance.successRate}`);
    console.log(`   🕐 Uptime: ${stats.uptime}`);
    
    if (stats.errors > 0) {
      console.log(`   ⚠️  Errors: ${stats.errors}`);
    }
  }

  /**
   * Logs detailed system status and performance metrics
   */
  logDetailedStatus(stats) {
    console.log(`\n📈 [${new Date().toLocaleTimeString()}] Detailed Papibot Analytics:`);
    console.log('=====================================');
    console.log(`🎯 Target Group: ${this.config.groupId}`);
    console.log(`📱 WhatsApp Status: ${stats.isConnected ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log(`🕐 System Uptime: ${stats.uptime}`);
    console.log(`🔄 Restart Count: ${this.restartCount}`);
    console.log('');
    console.log('📊 Message Processing:');
    console.log(`   Total Messages: ${stats.messagesProcessed}`);
    console.log(`   Sell Offers Detected: ${stats.sellOffersDetected}`);
    console.log(`   Detection Rate: ${stats.performance.detectionRate}`);
    console.log('');
    console.log('🎯 Response Performance:');
    console.log(`   Responses Sent: ${stats.responsesSent}`);
    console.log(`   Success Rate: ${stats.performance.successRate}`);
    console.log(`   Average Response Time: ${stats.performance.avgResponseTime}`);
    console.log(`   Target: <1000ms`);
    console.log('');
    console.log('🚨 Error Tracking:');
    console.log(`   System Errors: ${stats.errors}`);
    console.log(`   Orchestrator Errors: ${this.errorCount}`);
    console.log('');
    console.log('💰 Rate Limiting:');
    console.log(`   Responses Last Minute: ${stats.responderStats.responsesLastMinute}/15`);
    console.log(`   Can Send Response: ${stats.responderStats.canSendResponse ? 'Yes' : 'No'}`);
    console.log('=====================================');
  }

  /**
   * Handles system errors with automatic recovery
   */
  async handleError(error) {
    this.errorCount++;
    console.error(`💥 [${new Date().toLocaleTimeString()}] System Error #${this.errorCount}:`, error.message);

    if (this.config.autoRestart && this.restartCount < this.config.maxRestarts) {
      console.log(`🔄 Attempting automatic restart (${this.restartCount + 1}/${this.config.maxRestarts})...`);
      await this.restart();
    } else {
      console.error('💀 Maximum restart attempts reached or auto-restart disabled');
      console.error('🛑 Papibot system stopping...');
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Restarts the Papibot system after a failure
   */
  async restart() {
    try {
      this.restartCount++;
      console.log(`🔄 [${new Date().toLocaleTimeString()}] Restarting Papibot system...`);
      
      // Stop current instance
      if (this.listener) {
        await this.listener.stop();
        this.listener = null;
      }
      
      // Wait before restart
      console.log(`⏳ Waiting ${this.config.restartDelay / 1000} seconds before restart...`);
      await new Promise(resolve => setTimeout(resolve, this.config.restartDelay));
      
      // Restart system
      this.listener = new P2PListener();
      await this.listener.startPapibot();
      
      console.log(`✅ [${new Date().toLocaleTimeString()}] Papibot system restarted successfully (attempt ${this.restartCount})`);
      
    } catch (restartError) {
      console.error('❌ Failed to restart Papibot system:', restartError);
      this.handleError(restartError);
    }
  }

  /**
   * Gracefully stops the Papibot system
   */
  async stop() {
    console.log('🛑 Stopping Papibot Orchestrator...');
    this.isRunning = false;
    
    if (this.listener) {
      await this.listener.stop();
      this.listener = null;
    }
    
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    console.log(`📊 Final Stats - Uptime: ${Math.floor(uptime / 1000 / 60)} minutes, Restarts: ${this.restartCount}, Errors: ${this.errorCount}`);
    console.log('✅ Papibot Orchestrator stopped');
  }

  /**
   * Gets current system status
   */
  getStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      isRunning: this.isRunning,
      startTime: this.startTime?.toISOString(),
      uptime: `${Math.floor(uptime / 1000 / 60)} minutes`,
      restartCount: this.restartCount,
      errorCount: this.errorCount,
      config: this.config,
      listener: this.listener ? this.listener.getStats() : null
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🤖 PAPIBOT P2P - Costa Rican Crypto Response Bot');
  console.log('🎯 Automatic WhatsApp Sell Offer Response System');
  console.log('⚡ Ultra-fast <1s response times');
  console.log('🇨🇷 Authentic pachuco style responses');
  console.log('');

  const orchestrator = new PapibotOrchestrator();
  
  try {
    await orchestrator.start();
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('💥 Failed to start Papibot:', error);
    process.exit(1);
  }
}

// Handle direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
  });
}

export default PapibotOrchestrator;