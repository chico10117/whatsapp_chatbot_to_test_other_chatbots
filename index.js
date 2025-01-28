import dotenv from 'dotenv';
import PQueue from 'p-queue';
import PromptBuilder from './prompt.js';
dotenv.config();
import makeWASocket, { DisconnectReason, BufferJSON, useMultiFileAuthState, delay } from '@whiskeysockets/baileys'
import * as fs from 'fs'
const { state, saveCreds } = await useMultiFileAuthState('store_wa-session')
import OpenAI from 'openai';
import YelmoFetcher from './yelmo-fetcher.js';
// Mapa para almacenar el historial de conversaciones por usuario
const conversationHistory = new Map();
let globalClient = null;
let movies = [];
let menu = [];
const promptBuilder = new PromptBuilder();
const yelmoFetcher = new YelmoFetcher('madrid');

// *** 1) Creamos la cola con concurrencia = 1 ***
const queue = new PQueue({
    concurrency: 1,
    autoStart: true // si prefieres que inicie de inmediato, pon true
});

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
    baseURL: "https://gateway.ai.cloudflare.com/v1/9536a9ec53cf05783eefb6f6d1c06292/reco-test/openai"
});



// Este método procesa la lógica de cada mensaje.
const proc = async m => {
    if (m.messages[0].key.fromMe) return // ignore self messages
    const msg = m.messages[0].message?.conversation
    console.log(m.messages[0])
    try {
        const jid = m.messages[0].key.remoteJid
        const messageType = getContentType(m)
         // si es una foto, no procesamos y respondemos con un mensaje
        if (messageType === 'imageMessage') {
            await globalClient.sendMessage(jid, { text: "No puedo procesar imágenes, por favor envíame un mensaje de texto." });
            return;
        }
        // Actualizar el historial del usuario
        updateConversationHistory(jid, 'user', msg);
        // Obtener el historial completo del usuario
        const messages = getMessages(jid);

        // TODO
        // 1) Obtener la intencion en el mensaje del usuario con el prompt de intenciones
        // 2) Si tengo la intención, responder con el prompt correspondiente y los datos asociados
        // 3) Si no tengo la intención, responder con el prompt general y todos datos asociados

       

        // Preparar el prompt para enviar a lA IA
        movies = await yelmoFetcher.findMoviesByCinema("palafox-luxury");
        menu = await yelmoFetcher.getCinemaMenu("palafox-luxury");
        const prompt = promptBuilder.buildGeneralPrompt(movies, menu);

        await globalClient.presenceSubscribe(jid)
        await delay(500)
        await globalClient.sendPresenceUpdate('composing', jid)
        console.log("Enviando mensaje a OpenAI:");
        // Llamar a OpenAI con el historial completo
        const gptResponse = await client.chat.completions.create({
            // model: 'deepseek-chat',
            model: 'gpt-4o',
            messages: [
                { role: "assistant", content: prompt },
                ...messages.conversation.map((entry) => ({ role: entry.role, content: entry.content })),
                { role: "user", content: msg }],
            max_tokens: 2000,
            temperature: 0.7,
        });
        console.log("Messages", messages);
        const botResponse = gptResponse.choices[0].message.content;

        // Agregar la respuesta del bot al historial
        updateConversationHistory(jid, 'assistant', botResponse);

        // Enviar la respuesta al usuario
        await globalClient.sendMessage(jid, { text: botResponse });
        await globalClient.sendPresenceUpdate('paused', jid);
    } catch (error) {
        console.error("Error al llamar a la API de OpenAI:", error.response?.data || error.message);
    }

};

// *** 2) En el evento onMessage, encolamos la llamada a proc() ***
const processMessage = message => queue.add(() => proc(message));

// Función para actualizar el historial de conversación
function updateConversationHistory(userId, role, content) {
    if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, { conversation: [], lastInteraction: Date.now() });
    }

    // Agregar el nuevo mensaje al historial del usuario
    conversationHistory.get(userId).conversation.push({ role, content });
    conversationHistory.get(userId).lastInteraction = Date.now();


    // Limpiar mensajes más antiguos si exceden la hora (TTL manual)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    // remove users who haven't interacted in the last hour
    for (const [userId, { lastInteraction }] of conversationHistory) {
        if (lastInteraction < oneHourAgo) {
            conversationHistory.delete(userId);
        }
    }
}
// Función para obtener el historial de mensajes para el usuario
function getMessages(userId) {
    return conversationHistory.get(userId) || [];
}


async function connectToWhatsApp() {
    globalClient = makeWASocket.default({
        // can provide additional config here
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        auth: state
    })
    await yelmoFetcher.setupDB();

    globalClient.ev.on('creds.update', saveCreds)
    globalClient.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== 401) {
                connectToWhatsApp()
            } else {
                console.log('Logout :(')
            }
        } else if (connection === 'open') {
            console.log('Connected :)')
        }
    })
    globalClient.ev.on('messages.upsert', processMessage)
}
connectToWhatsApp()