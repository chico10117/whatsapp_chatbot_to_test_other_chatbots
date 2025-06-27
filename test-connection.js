import dotenv from 'dotenv';
import makeWASocket, { useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

dotenv.config();

async function testConnection() {
  console.log('🧪 Testing WhatsApp Connection');
  console.log('==============================\n');

  let globalClient = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('store_wa-session');

    globalClient = makeWASocket.default({
      generateHighQualityLinkPreview: true,
      auth: state,
      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      printQRInTerminal: false
    });

    globalClient.ev.on('creds.update', saveCreds);

    // Test connection with shorter timeout
    const connected = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection test timeout after 2 minutes'));
      }, 120000); // 2 minute timeout for testing

      let isResolved = false;

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
          
          if (!isResolved) {
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                globalClient.ev.off('connection.update', handleConnection);
                console.log('🎯 Connection test completed successfully!');
                resolve(true);
              }
            }, 3000);
          }
        } else if (connection === 'close') {
          if (lastDisconnect?.error?.output?.statusCode === 401) {
            isResolved = true;
            clearTimeout(timeout);
            globalClient.ev.off('connection.update', handleConnection);
            reject(new Error('WhatsApp logout - please scan QR code again'));
          } else {
            console.log('🔄 Connection lost, but this is normal during setup...');
          }
        }
      };

      globalClient.ev.on('connection.update', handleConnection);
    });

    if (connected) {
      console.log('\n🎉 Connection test passed!');
      console.log('✅ You can now run the full BOTTY test with: npm run test-reco');
      
      // Test sending a simple message to validate messaging works
      const recoNumber = (process.env.RECO_WHATSAPP_NUMBER || '+593994170801').replace('+', '') + '@s.whatsapp.net';
      console.log(`\n📤 Sending test message to ${recoNumber}...`);
      
      await globalClient.sendMessage(recoNumber, { 
        text: '🧪 BOTTY Connection Test - This is a test message to verify the connection works.' 
      });
      
      console.log('✅ Test message sent successfully!');
    }

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 Try the following:');
      console.log('   1. Clear session: rm -rf store_wa-session/');
      console.log('   2. Ensure stable internet connection');
      console.log('   3. Make sure WhatsApp Web is not open elsewhere');
      console.log('   4. Try scanning QR code again');
    }
    
    process.exit(1);
  } finally {
    if (globalClient) {
      console.log('\n🔌 Closing connection...');
      await globalClient.end();
    }
  }

  console.log('\n✅ Connection test completed. You can now run the full test.');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down connection test...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

testConnection().catch(console.error); 