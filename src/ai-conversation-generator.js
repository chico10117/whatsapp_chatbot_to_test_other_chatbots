import OpenAI from 'openai';

export default class AIConversationGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1"
    });
    this.conversationHistory = new Map(); // Store conversation history per persona
    this.isCloudflareGateway = false; // using official OpenAI API - responses API supported
  }

  async generateInitialQuestion(persona) {
    const systemPrompt = this.buildSystemPrompt(persona);
    const questionModel = process.env.QUESTION_MODEL || "gpt-5";
    
    try {
      let raw = '';
      const canUseResponses = !!(this.openai.responses && typeof this.openai.responses.create === 'function')
        && (process.env.USE_RESPONSES_API || 'true') !== 'false';

      if (canUseResponses) {
        const responsesPayload = {
          model: questionModel,
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate your first question to start the conversation with the restaurant recommendation bot. Be natural and stay in character." }
          ]
        };
        
        // Add reasoning controls when explicitly enabled and supported
        if (!this.isCloudflareGateway && (process.env.ENABLE_REASONING || 'false') === 'true') {
          responsesPayload.reasoning = { effort: 'medium' };
        }
        
        const response = await this.openai.responses.create(responsesPayload);
        raw = response?.output_text 
          || response?.output?.[0]?.content?.[0]?.text?.value 
          || '';
      } else {
        // Fallback to chat.completions for gateways without Responses API
        const response = await this.openai.chat.completions.create({
          model: questionModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Generate your first question to start the conversation with the restaurant recommendation bot. Be natural and stay in character." }
          ],
          reasoning_effort: "minimal"
        });
        raw = response?.choices?.[0]?.message?.content || '';
      }

      const question = raw.trim();
      
      // Initialize conversation history for this persona with proper role structure
      this.conversationHistory.set(persona.id, [
        { role: 'assistant', content: question }
      ]);

      return question;
    } catch (error) {
      console.error(`Error generating initial question for ${persona.name}:`, error);
      // Fallback to a basic question
      return this.getFallbackQuestion(persona);
    }
  }

  async generateFollowUpQuestion(persona, recoResponse, questionNumber) {
    const history = this.conversationHistory.get(persona.id) || [];
    
    // Check if the response is an error message
    if (this.isErrorResponse(recoResponse)) {
      console.log(`   ⚠️  Detected error response from RECO, not adding to conversation history`);
      // Return a retry or clarification question instead of using error in context
      return this.getRetryQuestion(persona, questionNumber);
    }
    
    // Add Reco's response to history with proper role (user from the AI persona's perspective)
    history.push({ role: 'user', content: recoResponse });
    
    const systemPrompt = this.buildSystemPrompt(persona);
    
    // Check if we should end the conversation
    if (questionNumber >= persona.maxQuestions) {
      return null; // End conversation
    }

    const questionModel = process.env.QUESTION_MODEL || "gpt-5";

    try {
      // Create conversation-aware input messages
      const inputMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "This is your ongoing conversation with RECO, a restaurant recommendation bot. Based on the conversation history, generate your next question naturally:" },
        ...history,
        { 
          role: "user", 
          content: `Generate your next question (${questionNumber + 1}/${persona.maxQuestions}) based on RECO's latest response. Stay in character. If RECO gave recommendations, ask for details, alternatives, or related questions. Be conversational and natural.`
        }
      ];

      let raw = '';
      const canUseResponses = !!(this.openai.responses && typeof this.openai.responses.create === 'function')
        && (process.env.USE_RESPONSES_API || 'true') !== 'false';

      if (canUseResponses) {
        const responsesPayload = {
          model: questionModel,
          input: inputMessages
        };
        
        // Add reasoning controls when explicitly enabled and supported
        if (!this.isCloudflareGateway && (process.env.ENABLE_REASONING || 'false') === 'true') {
          responsesPayload.reasoning = { effort: 'medium' };
        }
        
        const response = await this.openai.responses.create(responsesPayload);
        raw = response?.output_text 
          || response?.output?.[0]?.content?.[0]?.text?.value 
          || '';
      } else {
        // Fallback to chat.completions for gateways without Responses API
        const response = await this.openai.chat.completions.create({
          model: questionModel,
          messages: inputMessages,
          reasoning_effort: "minimal"
        });
        raw = response?.choices?.[0]?.message?.content || '';
      }

      const question = raw.trim();
      
      // Add the new question to history with proper role (assistant from AI persona's perspective)
      history.push({ role: 'assistant', content: question });
      this.conversationHistory.set(persona.id, history);

      return question;
    } catch (error) {
      console.error(`Error generating follow-up question for ${persona.name}:`, error);
      return this.getFallbackFollowUp(persona, questionNumber);
    }
  }

  buildSystemPrompt(persona) {
    const language = persona.language === 'en' ? 'English' : 'Spanish';
    
    return `You are ${persona.name}, a ${persona.description}.

PERSONALITY: ${persona.personality}

INTERESTS: ${persona.interests.join(', ')}

CONVERSATION STYLE: ${persona.conversationStyle}

GOALS: ${persona.goals.join(', ')}

INSTRUCTIONS:
- Always respond in ${language}
- Stay completely in character as ${persona.name}
- You are chatting with a restaurant recommendation bot called RECO
- Ask questions naturally as this persona would
- Be conversational and realistic
- Don't break character or mention that you're an AI
- Keep questions focused on restaurants, food, and dining
- Ask follow-up questions based on what the bot tells you
- Show genuine interest in the recommendations
- Ask for specific details when appropriate
- Maximum one question per response
- Keep responses concise (1-2 sentences max)`;
  }

  getFallbackQuestion(persona) {
    const fallbacks = {
      health_conscious: "Hola, busco restaurantes con opciones veganas saludables",
      budget_conscious: "Hola, necesito encontrar comida buena y barata para estudiantes",
      family_kids: "Hola, busco restaurantes family-friendly con facilidades para niños",
      international_tourist: "Hi, I'm looking for authentic Spanish restaurants for tourists",
      foodie_adventurous: "Hola, busco experiencias gastronómicas únicas y de alta cocina"
    };
    
    return fallbacks[persona.id] || "Hola, ¿me puedes ayudar a encontrar un buen restaurante?";
  }

  getFallbackFollowUp(persona, questionNumber) {
    const fallbacks = {
      health_conscious: [
        "¿Tienen opciones sin gluten?",
        "¿Qué tan frescas son las ensaladas?", 
        "¿Usan ingredientes orgánicos?"
      ],
      budget_conscious: [
        "¿Cuánto cuesta aproximadamente?",
        "¿Tienen descuentos para estudiantes?",
        "¿Hay ofertas especiales?"
      ],
      family_kids: [
        "¿Tienen zona de juegos?",
        "¿Es seguro para niños pequeños?",
        "¿Tienen menú infantil?"
      ],
      international_tourist: [
        "Do they have English menus?",
        "Is it tourist-friendly?",
        "What makes it authentic?"
      ],
      foodie_adventurous: [
        "¿Qué técnicas culinarias usan?",
        "¿Tienen menú degustación?",
        "¿Qué ingredientes especiales usan?"
      ]
    };
    
    const options = fallbacks[persona.id] || ["¿Me puedes dar más detalles?"];
    return options[questionNumber % options.length];
  }

  resetConversation(personaId) {
    this.conversationHistory.delete(personaId);
  }

  getConversationHistory(personaId) {
    return this.conversationHistory.get(personaId) || [];
  }

  isErrorResponse(response) {
    if (!response) return false;
    
    const errorPatterns = [
      /error processing message/i,
      /error al procesar/i,
      /error occurred/i,
      /something went wrong/i,
      /no puedo procesar/i,
      /unable to process/i,
      /error:/i,
      /^error$/i
    ];
    
    return errorPatterns.some(pattern => pattern.test(response));
  }

  getRetryQuestion(persona, questionNumber) {
    // Generate context-aware retry questions based on persona
    const retryQuestions = {
      health_conscious: [
        "Disculpa, ¿podrías recomendarme restaurantes vegetarianos o veganos?",
        "Perdón, busco lugares con opciones saludables, ¿conoces alguno?",
        "¿Hay restaurantes con comida orgánica por aquí?"
      ],
      budget_conscious: [
        "Hola, busco restaurantes económicos, ¿me puedes ayudar?",
        "¿Conoces lugares baratos para comer bien?",
        "¿Dónde puedo encontrar menús del día económicos?"
      ],
      family_kids: [
        "Hola, necesito restaurantes para ir con niños, ¿cuáles recomiendas?",
        "¿Qué lugares son buenos para familias con niños pequeños?",
        "¿Conoces restaurantes con zona infantil?"
      ],
      international_tourist: [
        "Hi, can you recommend authentic Spanish restaurants?",
        "I'm looking for traditional tapas bars, any suggestions?",
        "Where can I find good paella in Madrid?"
      ],
      foodie_adventurous: [
        "Busco restaurantes con cocina de autor, ¿qué recomiendas?",
        "¿Conoces lugares con gastronomía molecular o innovadora?",
        "¿Cuáles son los mejores restaurantes gourmet de la zona?"
      ]
    };
    
    const personaRetries = retryQuestions[persona.id] || [
      "¿Podrías recomendarme algunos restaurantes?",
      "¿Qué lugares para comer sugieres?",
      "¿Conoces buenos restaurantes por aquí?"
    ];
    
    // Rotate through retry questions
    return personaRetries[questionNumber % personaRetries.length];
  }
} 