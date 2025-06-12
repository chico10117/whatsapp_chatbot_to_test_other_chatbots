import OpenAI from 'openai';

export default class AIConversationGenerator {
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
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: "Generate your first question to start the conversation with the restaurant recommendation bot. Be natural and stay in character."
          }
        ],
        max_tokens: 150,
        temperature: 0.8
      });

      const question = response.choices[0].message.content.trim();
      
      // Initialize conversation history for this persona
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
    
    // Add Reco's response to history
    history.push({ role: 'user', content: recoResponse });
    
    const systemPrompt = this.buildSystemPrompt(persona);
    
    // Check if we should end the conversation
    if (questionNumber >= persona.maxQuestions) {
      return null; // End conversation
    }

    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "This is your conversation with a restaurant recommendation bot so far:" },
        ...history,
        { 
          role: "user", 
          content: `Generate your next question based on the bot's response. Stay in character. This is question ${questionNumber + 1} of ${persona.maxQuestions}. If the bot gave good recommendations, you might ask for more details, alternatives, or related questions. Be natural and conversational.`
        }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1",
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
} 