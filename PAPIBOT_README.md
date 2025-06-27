# 🤖 PAPIBOT P2P - Costa Rican Crypto Response Bot

**Ultra-fast WhatsApp P2P crypto offer response system with authentic pachuco costarricense style**

## 🎯 Project Overview

Papibot is an automated WhatsApp bot designed to monitor the "COMERCIANTE VERIFICADO P2P🇨🇷" group and instantly respond to cryptocurrency sell offers with authentic Costa Rican pachuco expressions. The bot achieves sub-1-second response times and uses sophisticated pattern matching to detect legitimate P2P offers.

## ⚡ Key Features

- **Ultra-fast responses** - Target <1 second response time
- **Authentic pachuco style** - Genuine Costa Rican expressions ("mae", "diay", "tuanis", "pura vida")
- **Smart detection** - Advanced regex patterns for P2P crypto offers
- **Rate limiting** - Prevents spam and WhatsApp bans
- **Error recovery** - Automatic restart and error handling
- **Comprehensive testing** - Full unit test coverage

## 🏗️ Architecture

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **Sell Offer Detector** | `src/sell-offer-detector.js` | Detects P2P crypto sell offers using regex patterns |
| **Papibot Responder** | `src/papibot-responder.js` | Generates authentic Costa Rican pachuco responses |
| **P2P Listener** | `src/p2p-listener.js` | WhatsApp integration and message processing |
| **Orchestrator** | `src/papibot-orchestrator.js` | Main runtime controller with error handling |
| **Tests** | `src/tests/` | Comprehensive unit test suite |

### Pattern Detection

The bot uses sophisticated pattern matching to identify sell offers:

```javascript
// Sell keywords
/\b(vendo|venta|liquido|liquidar|oferta|dispongo|cambio|ofrezco)\b/i

// Crypto terms
/\b(usdt|btc|eth|tether|binance|cripto|bitcoin|ethereum)\b/i

// Amount patterns
/\b\d{1,3}(\.\d{3})*(,\d+)?\s*(usd|usdt|eur|€|\$|₡|colones)\b/i

// P2P and banking terms
/\b(p2p|transferencia|bac|bcr|banco|nacional)\b/i
```

### Response Variations

Authentic Costa Rican pachuco responses include:

- "Aquí papibot, los compro"
- "Pura vida, los agarra el papibot"
- "Mae, ¡los jalo yo!"
- "¡Diay! Papibot los compra al toque"
- "Esos los agarro, papibot aquí"
- "Mae, papibot interesado"

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository (if not already)
git checkout papibot-p2p-integration

# Install dependencies
npm install
```

### 2. Configuration

Copy and configure your environment variables:

```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your settings
nano .env
```

Required `.env` configuration:

```env
# REQUIRED: WhatsApp Group ID (get using the guide below)
GROUP_ID=120363xxxxxxxxx@g.us

# OPTIONAL: Custom settings
WA_AUTH_STATE=papibot_auth_state
AUTO_RESTART=true
MAX_RESTARTS=5
RESTART_DELAY=30000
LOG_LEVEL=info
```

### 3. Get WhatsApp Group ID

**Method 1: Browser Developer Tools (Recommended)**

1. Open WhatsApp Web (`web.whatsapp.com`)
2. Select "COMERCIANTE VERIFICADO P2P🇨🇷" group
3. Press `F12` → Console tab
4. Paste and run this script:

```javascript
(function() {
    const groupName = "COMERCIANTE VERIFICADO P2P🇨🇷";
    const allChats = window.Store.Chat.models;
    const targetGroup = allChats.find(chat => 
        chat.isGroup && chat.name.includes(groupName)
    );
    
    if (targetGroup) {
        console.log("Group ID:", targetGroup.id._serialized);
        navigator.clipboard.writeText(targetGroup.id._serialized);
        alert("Group ID copied: " + targetGroup.id._serialized);
    } else {
        console.log("Group not found");
    }
})();
```

5. Copy the Group ID to your `.env` file

### 4. Run Papibot

```bash
# Start Papibot
npm run papibot

# Development mode with verbose logging
npm run papibot-dev

# Test the system first
npm test
```

### 5. Authentication

When starting for the first time:

1. Scan the QR code with your WhatsApp
2. Wait for "✅ Connected to WhatsApp successfully"
3. Monitor the console for activity

## 📊 Commands

| Command | Description |
|---------|-------------|
| `npm run papibot` | Start Papibot production mode |
| `npm run papibot-dev` | Start with development logging |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run clear-papibot-session` | Clear WhatsApp session data |

## 🔍 Detection Examples

**✅ WILL RESPOND TO:**
- "Vendo 5000 USDT transferencia BAC"
- "Liquido 10k tether sinpe móvil"
- "Oferta BTC 1.5 banco nacional"
- "Dispongo 8000 USD cripto p2p"
- "Cambio 15.000 USDT BCR"

**❌ WILL NOT RESPOND TO:**
- "Compro USDT al mejor precio"
- "¿Cuánto está el bitcoin hoy?"
- "Busco tether urgente"
- "Ya vendido, gracias"
- "Buenos días grupo"

## 📈 Performance Metrics

**Target Metrics:**
- Response time: <1 second
- Detection accuracy: >95%
- Uptime: >99%
- Rate limit: Max 15 responses/minute

**Monitoring:**
```bash
# View real-time logs
npm run papibot-dev

# Check system status
# (Built-in monitoring displays every minute)
```

## 🧪 Testing

Comprehensive test suite with 40+ test cases:

```bash
# Run all tests
npm test

# Run specific test files
npm run test:papibot

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- Sell offer detection patterns
- Response generation and validation
- Rate limiting functionality
- Costa Rican authenticity
- Performance benchmarks

## 🛡️ Security & Safety

### Rate Limiting
- Maximum 1 response per 2 seconds
- Max 15 responses per minute
- Automatic backoff on errors

### Fail-safes
- Graceful error handling
- Automatic restart (up to 5 attempts)
- Session management
- Connection recovery

### Best Practices
- Uses official WhatsApp Web API (Baileys)
- Respects WhatsApp Terms of Service
- Implements proper authentication
- Secure credential storage

## 📝 Deployment

### Local Development
```bash
npm run papibot-dev
```

### Production with PM2
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "papibot" -- run papibot

# Monitor
pm2 logs papibot

# Auto-restart on boot
pm2 save
pm2 startup
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "papibot"]
```

## 🚨 Troubleshooting

### Common Issues

**Connection Problems:**
```bash
# Clear session and restart
npm run clear-papibot-session
npm run papibot
```

**No QR Code:**
- Ensure terminal supports QR display
- Try different terminal emulator
- Check console for errors

**Group Not Found:**
- Verify GROUP_ID in .env
- Ensure you're a member of the group
- Check group name exactly

**Rate Limiting:**
- Normal behavior to prevent spam
- Wait 2 seconds between responses
- Monitor with development mode

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run papibot-dev

# Monitor specific components
DEBUG=papibot:* npm run papibot-dev
```

## 🎯 Costa Rican Authenticity

### Pachuco Expressions Used
- **"mae"** - Costa Rican equivalent of "dude/bro"
- **"diay"** - Costa Rican expression of surprise/emphasis
- **"tuanis"** - "cool/awesome" in Costa Rican slang
- **"pura vida"** - Classic Costa Rican greeting/expression
- **"upe"** - Informal Costa Rican greeting
- **"al chile"** - "for real/seriously"

### Regional Banking Terms
- **BAC** - Banco BAC San José
- **BCR** - Banco de Costa Rica
- **Banco Nacional** - Costa Rican national bank
- **SINPE** - Costa Rican instant payment system

## 📈 Future Enhancements

### v1.1 Roadmap
- [ ] Machine learning classifier for better detection
- [ ] Context-aware responses based on amount
- [ ] Integration with Costa Rican banking APIs
- [ ] Advanced humor and regional jokes

### v1.2 Roadmap
- [ ] Multi-group support
- [ ] Web dashboard for monitoring
- [ ] Advanced analytics and reporting
- [ ] Mobile app notifications

## 🤝 Contributing

This bot was built for the Costa Rican P2P crypto trading community. Contributions welcome:

1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Add comprehensive tests
5. Submit pull request

## ⚖️ Legal & Compliance

- Designed for legitimate P2P crypto trading
- Respects WhatsApp Terms of Service
- User must be legitimate group member
- No data harvesting or privacy violations
- For educational and automation purposes

## 📞 Support

For issues or questions:

1. Check troubleshooting section
2. Review console logs
3. Verify environment configuration
4. Test with development mode

---

**PAPIBOT v1.0** - Pura vida, mae! 🇨🇷🤖💰

*Built with ❤️ for the Costa Rican crypto community*