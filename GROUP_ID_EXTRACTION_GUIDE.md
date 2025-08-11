# 🔍 Quick GROUP_ID Extraction Guide

## For "COMERCIANTE VERIFICADO P2P🇨🇷"

### Method 1: WhatsApp Web Console (Recommended)

1. **Open WhatsApp Web**: https://web.whatsapp.com
2. **Login**: Scan QR with your phone
3. **Select Group**: Click "COMERCIANTE VERIFICADO P2P🇨🇷"
4. **Open Console**: Press F12 → Console tab
5. **Run Script**: Copy/paste the script from extract-group-id-web.js
6. **Copy Result**: Get GROUP_ID from console output
7. **Update .env**: Add GROUP_ID=120363xxxxxxxxx@g.us

### Method 2: Manual Browser Inspection

1. Open WhatsApp Web and select the P2P group
2. Right-click group name → "Inspect Element"
3. Look for data-id or similar attributes
4. Find ID in format: 120363xxxxxxxxx@g.us

### Method 3: Network Tab

1. Open WhatsApp Web → F12 → Network tab
2. Refresh page and select group
3. Look for API calls containing group data
4. Find group ID in request/response

## Next Steps

After getting GROUP_ID:
```bash
# Update .env file
echo "GROUP_ID=YOUR_GROUP_ID_HERE" >> .env

# Test the system
npm test

# Start Papibot
npm run papibot
```

## Support

If you need help, the main extraction script is in:
- `extract-group-id-web.js` (browser console method)
- `extract-group-id.js` (automated method - if working)
