import OpenAI from 'openai';

export default class CinepolisAIConversationGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.conversationHistory = new Map(); // Store conversation history per persona
  }

  async generateInitialQuestion(persona) {
    const systemPrompt = this.buildSystemPrompt(persona);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: "Inicia la conversación con el bot de Cinépolis. Tu primer mensaje DEBE ser exactamente 'Acepto términos y condiciones' para activar el bot, luego en el siguiente mensaje haz tu primera pregunta natural sobre promociones de cine. Responde SOLO con 'Acepto términos y condiciones'."
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      });

      const question = response.choices[0].message.content.trim();
      
      // Initialize conversation history for this persona
      this.conversationHistory.set(persona.id, [
        { role: 'assistant', content: question }
      ]);

      return question;
    } catch (error) {
      console.error(`Error generating initial question for ${persona.name}:`, error);
      // Fallback to terms acceptance
      return 'Acepto términos y condiciones';
    }
  }

  async generateFollowUpQuestion(persona, palomaResponse, questionNumber) {
    const history = this.conversationHistory.get(persona.id) || [];
    
    // Add Paloma's response to history
    history.push({ role: 'user', content: palomaResponse });
    
    const systemPrompt = this.buildSystemPrompt(persona);
    
    // Check if we should end the conversation
    if (questionNumber >= persona.maxQuestions) {
      return null; // End conversation
    }

    // Special handling for first real question after terms acceptance
    if (questionNumber === 1 && palomaResponse.toLowerCase().includes('paloma')) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `El bot de Cinépolis "Paloma" te ha saludado. Ahora haz tu primera pregunta real sobre promociones de cine. Mantente en tu personaje como ${persona.name}. Pregunta específicamente sobre promociones, puede ser para dulcería o taquilla, y menciona para cuántas personas buscas.`
            }
          ],
          max_tokens: 150,
          temperature: 0.8
        });

        const question = response.choices[0].message.content.trim();
        history.push({ role: 'assistant', content: question });
        this.conversationHistory.set(persona.id, history);
        return question;
      } catch (error) {
        console.error(`Error generating first real question for ${persona.name}:`, error);
        return this.getFallbackQuestion(persona);
      }
    }

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Esta es tu conversación con el bot de Cinépolis Paloma hasta ahora:" },
        ...history,
        { 
          role: "user", 
          content: `Genera tu siguiente pregunta basada en la respuesta del bot. Mantente en tu personaje. Esta es la pregunta ${questionNumber + 1} de ${persona.maxQuestions}. 

Si el bot te ofreció promociones, puedes:
- Preguntar detalles específicos de una promoción
- Preguntar si aplica para tu grupo (${persona.cinemaPreferences.groupSize})
- Preguntar sobre dulcería vs taquilla
- Pedir información sobre QR codes
- Confirmar que quieres una promoción específica

Si te enviaron un QR, puedes:
- Agradecer y preguntar por otra promoción
- Preguntar detalles de uso del QR
- Pedir promociones diferentes

Sé natural y conversacional como ${persona.name}.`
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: messages,
        max_tokens: 150,
        temperature: 0.8
      });

      const question = response.choices[0].message.content.trim();
      
      // Add the new question to history
      history.push({ role: 'assistant', content: question });
      this.conversationHistory.set(persona.id, history);

      return question;
    } catch (error) {
      console.error(`Error generating follow-up question for ${persona.name}:`, error);
      return this.getFallbackFollowUp(persona, questionNumber);
    }
  }

  buildSystemPrompt(persona) {
    return `Eres ${persona.name}, ${persona.description}.

PERSONALIDAD: ${persona.personality}

INTERESES CINEMATOGRÁFICOS: ${persona.interests.join(', ')}

ESTILO DE CONVERSACIÓN: ${persona.conversationStyle}

OBJETIVOS: ${persona.goals.join(', ')}

PREFERENCIAS DE CINE:
- Tamaño de grupo: ${persona.cinemaPreferences.groupSize}
- Presupuesto: ${persona.cinemaPreferences.budget}
- Horarios preferidos: ${persona.cinemaPreferences.preferredTimes.join(', ')}
- Géneros de interés: ${persona.cinemaPreferences.interests.join(', ')}
- Enfoque principal: ${persona.cinemaPreferences.focuses.join(', ')}

INSTRUCCIONES:
- Siempre responde en español mexicano
- Mantente completamente en el personaje de ${persona.name}
- Estás chateando con "Paloma", el bot de promociones de Cinépolis
- Haz preguntas naturales sobre promociones de cine
- Sé conversacional y realista
- No rompas el personaje ni menciones que eres una IA
- Enfócate en promociones, dulcería, taquilla, y códigos QR
- Haz preguntas de seguimiento basadas en lo que te diga Paloma
- Muestra interés genuino en las promociones
- Pregunta por detalles específicos cuando sea apropiado
- Máximo una pregunta por respuesta
- Mantén respuestas concisas (1-2 oraciones máximo)
- Menciona específicamente para cuántas personas buscas promociones
- Usa tu estilo de conversación característico y expresiones mexicanas`;
  }

  getFallbackQuestion(persona) {
    const fallbacks = {
      estudiante_joven: "¡Órale! ¿Qué promociones tienen para estudiantes?",
      familia_tradicional: "Buenos días, ¿qué promociones familiares tienen disponibles?",
      pareja_romantica: "Hola, busco algo especial para una cita romántica",
      adulto_mayor: "Buenos días, ¿tienen descuentos para adultos mayores?",
      cinefilo_gourmet: "Saludos, me interesa conocer sus promociones premium"
    };
    
    return fallbacks[persona.id] || "Hola, ¿qué promociones tienen disponibles?";
  }

  getFallbackFollowUp(persona, questionNumber) {
    const fallbacks = {
      estudiante_joven: [
        "¿Y esa promo para cuántas personas es?",
        "Órale, ¿y qué incluye exactamente?",
        "¿Esa es para dulcería o para taquilla?",
        "¿Hay descuento para estudiantes?",
        "¿Está chido para 2 personas?"
      ],
      familia_tradicional: [
        "Perfecto, ¿y para niños también aplica?",
        "¿Esa promoción es para toda la familia?",
        "Muchas gracias, ¿qué más incluye?",
        "¿Es seguro para niños pequeños?",
        "¿Para 4 personas qué recomiendan?"
      ],
      pareja_romantica: [
        "Genial, ¿y para 2 personas qué tal?",
        "Me encanta, ¿qué más detalles tiene?",
        "Súper, ¿es especial para parejas?",
        "¿Incluye dulcería también?",
        "¿Qué tan romántico es el ambiente?"
      ],
      adulto_mayor: [
        "Muy amable, ¿y para personas mayores?",
        "Le agradezco, ¿qué requisitos tiene?",
        "Perfecto, ¿cuándo está disponible?",
        "¿Es cómodo para adultos mayores?",
        "¿Hay facilidades especiales?"
      ],
      cinefilo_gourmet: [
        "Excelente, ¿qué beneficios adicionales incluye?",
        "Impresionante, ¿es la mejor opción disponible?",
        "Notable, ¿qué otras opciones premium hay?",
        "¿Incluye tecnología IMAX?",
        "¿Qué experiencias exclusivas ofrecen?"
      ]
    };
    
    const personaFallbacks = fallbacks[persona.id] || ["¿Me puede dar más detalles?"];
    return personaFallbacks[questionNumber % personaFallbacks.length];
  }

  resetConversation(personaId) {
    this.conversationHistory.delete(personaId);
  }

  getConversationHistory(personaId) {
    return this.conversationHistory.get(personaId) || [];
  }
}