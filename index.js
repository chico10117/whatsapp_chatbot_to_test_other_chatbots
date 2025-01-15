import dotenv from 'dotenv';
dotenv.config();
import makeWASocket, { DisconnectReason, BufferJSON, useMultiFileAuthState, delay } from '@whiskeysockets/baileys'
import * as fs from 'fs'
const { state, saveCreds } = await useMultiFileAuthState('store_wa-session')
import OpenAI from 'openai';
import YelmoFetcher from './yelmo-fetcher.js';
// Mapa para almacenar el historial de conversaciones por usuario
const conversationHistory = new Map();

const client = new OpenAI({
    apiKey: process.env['DEEPSEEK_API_KEY'], // This is the default and can be omitted
    baseURL: "https://gateway.ai.cloudflare.com/v1/9536a9ec53cf05783eefb6f6d1c06292/reco-test/deepseek"
});

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
    const sock = makeWASocket.default({
        // can provide additional config here
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        auth: state
    })


    const yelmoFetcher = new YelmoFetcher('madrid');
    await yelmoFetcher.setupDB();
    const movies = await yelmoFetcher.findMoviesByCinema("palafox-luxury");
    const menu = await yelmoFetcher.getCinemaMenu("palafox-luxury");
    // yelmoFetcher.printData();


    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (update) => {
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
    sock.ev.on('messages.upsert', async m => {
        if (m.messages[0].key.fromMe) return // ignore self messages
        const msg = m.messages[0].message?.conversation
        console.log(m.messages[0])
        try {
            const jid = m.messages[0].key.remoteJid
                // Actualizar el historial del usuario
        updateConversationHistory(jid, 'user', msg);
        // Obtener el historial completo del usuario
        const messages = getMessages(jid);


        // Preparar el prompt para enviar a OpenAI usando el modelo gpt4o-mini

        const prompt = `Eres un asistente virtual encargado de responder preguntas relacionadas con la cartelera y el menú del cine. Usa exclusivamente la información proporcionada en los JSON indicados para responder. Si una pregunta no puede ser respondida con la información disponible, debes indicarle al usuario que no dispones de esa información. No proporciones información fuera de estos datos, excepto saludos básicos.

        Cartelera del cine (JSON): ${JSON.stringify(movies)}
        Menú del cine (JSON): ${JSON.stringify(menu)}
        
        Debes tener en cuenta lo siguiente:
        1. Responde preguntas sobre películas, horarios, géneros, funciones y menú del cine.
        2. Reconoce y responde a palabras clave y expresiones comunes como: "cartelera", "películas de acción", "hoy a las 6", "funciones de [nombre de película]", "¿Qué hay de comer?", "menú del cine", etc.
        3. Sé flexible al interpretar frases incompletas o ambiguas como: "Acción?", "Comida", "[nombre de una película]", etc.
        4. Si no dispones de la información solicitada, responde con algo como: "Lo siento, no dispongo de esa información."
        5. Mantén las respuestas claras, precisas y basadas exclusivamente en los datos proporcionados.
        
        Ejemplo de Respuestas:
        • Pregunta: “películas de acción?”
          Respuesta: “En cartelera hay las siguientes películas de acción: [Lista de películas de acción y sus horarios].”
        • Pregunta: “[nombre de película]?”
          Respuesta: “[Nombre de película] está disponible a las [horarios y salas disponibles].”
        • Pregunta: “¿Qué hay de comer?”
          Respuesta: “El menú del cine incluye: [detalle del menú].”
        • Pregunta: “¿Funciones?”
          Respuesta: “Estas son las funciones disponibles hoy: [funciones y horarios].”
        • Pregunta: “Hola”
          Respuesta: “¡Hola! ¿En qué puedo ayudarte hoy?”`;
        
            await sock.presenceSubscribe(jid)
            await delay(500)
            await sock.sendPresenceUpdate('composing', jid)

            // Llamar a OpenAI con el historial completo
            const gptResponse = await client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: "system", content: "Eres un asistente que responde preguntas sobre la cartelera y el menú del cine." },
                    { role: "user", content: prompt},
                    ...messages.conversation.map((entry) => ({ role: entry.role, content: entry.content })),
                    { role: "user", content: msg },
                ],
                max_tokens: 2000,
                temperature: 0.7,
            });
            const botResponse = gptResponse.choices[0].message.content;

            // Agregar la respuesta del bot al historial
            updateConversationHistory(jid, 'assistant', botResponse);

            // Enviar la respuesta al usuario
            await sock.sendMessage(jid, { text: botResponse });
            await sock.sendPresenceUpdate('paused', jid);
        } catch (error) {
            console.error("Error al llamar a la API de OpenAI:", error.response?.data || error.message);
        }

    })
}
connectToWhatsApp()