import dotenv from 'dotenv';
dotenv.config();
import makeWASocket, { DisconnectReason, BufferJSON, useMultiFileAuthState, delay } from '@whiskeysockets/baileys'
import * as fs from 'fs'
const { state, saveCreds } = await useMultiFileAuthState('store_wa-session')
import OpenAI from 'openai';
import YelmoFetcher from './yelmo-fetcher.js';

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});


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
        // Preparar el prompt para enviar a OpenAI usando el modelo gpt4o-mini
        const prompt = `Eres un asistente virtual encargado de responder preguntas sobre la cartelera de cine basada en los datos proporcionados. Debes usar exclusivamente la información del siguiente JSON para responder. Si una pregunta no puede ser respondida con los datos disponibles en el JSON, debes indicarle al usuario que no dispones de esa información. Fuera de estos datos, solo puedes responder saludos o información estrictamente relacionada con las películas.
Este es el JSON con la información de la cartelera: ${JSON.stringify(movies)}.
Ejemplo de Respuesta:
	•	Pregunta: “¿Qué horarios tiene Kraven The Hunter?”
Respuesta: “Kraven The Hunter está disponible a las 05:05 PM (LUX) y 08:05 PM (LUX).”
	•	Pregunta: “¿Cuánto cuesta la entrada?”
Respuesta: “Lo siento, no dispongo de esa información.”
Pregunta del usuario: ${msg}
`
        try {
            const jid = m.messages[0].key.remoteJid
            await sock.presenceSubscribe(jid)
            await delay(500)
            await sock.sendPresenceUpdate('composing', jid)

            const gptResponse = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "Eres un asistente que responde preguntas sobre la cartelera del cine." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 1000, // Ajusta el número de tokens según tus necesidades
                temperature: 0.7, // Controla la creatividad de las respuestas
            })

            // Devuelve la respuesta del asistente
            console.log("Respuesta del asistente:");
            const msgRespose = gptResponse.choices[0].message.content;

            await sock.sendMessage(jid, { text: msgRespose })
            await sock.sendPresenceUpdate('paused', jid)
        } catch (error) {
            console.error("Error al llamar a la API de OpenAI:", error.response?.data || error.message);
        }

    })
}
connectToWhatsApp()