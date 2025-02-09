import dotenv from 'dotenv';
import PQueue from 'p-queue';
import PromptBuilder from './prompt.js';
import fs from 'fs/promises';
import makeWASocket, { DisconnectReason, BufferJSON, useMultiFileAuthState, delay, getContentType } from '@whiskeysockets/baileys';
import OpenAI from 'openai';
import CinepolisFetcher from './cinepolis-fetcher.js';
import cron from 'node-cron';

dotenv.config();

// Initialize state and auth
const { state, saveCreds } = await useMultiFileAuthState('store_wa-session');

// Initialize variables
let globalClient = null;
const conversationHistory = new Map();
const promptBuilder = new PromptBuilder();
const cinepolisFetcher = new CinepolisFetcher('cdmx-centro');

// Create queue for message processing
const queue = new PQueue({
    concurrency: 1,
    autoStart: true
});

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
    baseURL: "https://gateway.ai.cloudflare.com/v1/9536a9ec53cf05783eefb6f6d1c06292/reco-test/openai"
});

// Schedule cartelera updates every 4 hours
async function updateCartelera() {
    try {
        console.log('Updating cartelera...');
        await cinepolisFetcher.generateMarkdown();
        console.log('Cartelera updated successfully');
    } catch (error) {
        console.error('Error updating cartelera:', error);
    }
}

// Run update every 4 hours
cron.schedule('0 */4 * * *', updateCartelera);

// Process each message
const proc = async m => {
    if (m.messages[0].key.fromMe) return; // ignore self messages
    
    // Get message details
    const msg = m.messages[0].message?.conversation;
    const jid = m.messages[0].key.remoteJid;
    const pushName = m.messages[0].pushName;
    
    console.log('Message from:', pushName, '(', jid, '):', msg);

    try {
        const messageType = getContentType(m);
        if (messageType === 'imageMessage') {
            await globalClient.sendMessage(jid, { text: "No puedo procesar imágenes, por favor envíame un mensaje de texto." });
            return;
        }

        // Update conversation history
        updateConversationHistory(jid, 'user', msg);
        const messages = getMessages(jid);

        // Get latest cartelera data
        await cinepolisFetcher.generateMarkdown();
        const cartelera = await fs.readFile('cinepolis_cartelera.md', 'utf-8');

        // Prepare prompt with cartelera data
        const prompt = `${promptBuilder.buildGeneralPrompt(cartelera)}
        El nombre del usuario con el que estás hablando es: ${pushName}`;

        // Send typing indicator
        await globalClient.presenceSubscribe(jid);
        await delay(500);
        await globalClient.sendPresenceUpdate('composing', jid);

        console.log("Enviando mensaje a OpenAI:");
        const gptResponse = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: "assistant", content: prompt },
                ...messages.conversation.map((entry) => ({ role: entry.role, content: entry.content })),
                { role: "user", content: msg }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        });

        const botResponse = gptResponse.choices[0].message.content;

        // Update history and send response
        updateConversationHistory(jid, 'assistant', botResponse);
        await globalClient.sendMessage(jid, { text: botResponse });
        await globalClient.sendPresenceUpdate('paused', jid);
    } catch (error) {
        console.error("Error al procesar el mensaje:", error.response?.data || error.message);
        await globalClient.sendMessage(jid, { 
            text: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente en unos momentos." 
        });
    }
};

// Queue message processing
const processMessage = message => queue.add(() => proc(message));

// Conversation history management
function updateConversationHistory(userId, role, content) {
    if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, { conversation: [], lastInteraction: Date.now() });
    }

    conversationHistory.get(userId).conversation.push({ role, content });
    conversationHistory.get(userId).lastInteraction = Date.now();

    // Clean up old conversations (1 hour TTL)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [userId, { lastInteraction }] of conversationHistory) {
        if (lastInteraction < oneHourAgo) {
            conversationHistory.delete(userId);
        }
    }
}

function getMessages(userId) {
    return conversationHistory.get(userId) || [];
}

// WhatsApp connection setup
async function connectToWhatsApp() {
    globalClient = makeWASocket.default({
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        auth: state
    });

    // Initial cartelera fetch
    await cinepolisFetcher.generateMarkdown();

    // Set up event handlers
    globalClient.ev.on('creds.update', saveCreds);
    
    globalClient.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== 401) {
                connectToWhatsApp();
            } else {
                console.log('Logout :(');
            }
        } else if (connection === 'open') {
            console.log('Connected :)');
        }
    });

    globalClient.ev.on('messages.upsert', processMessage);
}

// Start the WhatsApp connection
connectToWhatsApp();