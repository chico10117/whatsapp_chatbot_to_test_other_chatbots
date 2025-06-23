import CinepolisTestPersonas from './cinepolis-test-personas.js';
import OpenAI from 'openai';

export default class CinepolisTestOrchestrator {
  constructor() {
    this.personas = new CinepolisTestPersonas();
    this.client = null;
  }

  getOpenAIClient() {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.client;
  }

  getPersonas() {
    return this.personas.getPersonas();
  }

  async generatePersonaQuestions(persona, count = 15) {
    // Generate a mix of predefined and dynamic questions for each persona
    const baseQuestions = this.getBaseQuestionsForPersona(persona);
    const dynamicQuestions = await this.generateDynamicQuestions(persona, count - baseQuestions.length);
    
    return [...baseQuestions, ...dynamicQuestions];
  }

  getBaseQuestionsForPersona(persona) {
    const greeting = this.personas.generatePersonaGreeting(persona);
    
    const commonQuestions = {
      'Luis Estudiante': [
        'Acepto términos y condiciones',
        greeting,
        '¿Tienen descuentos para estudiantes?',
        'Quiero ir con mi novia, ¿qué promociones tienen para 2 personas?',
        'Busco algo barato en dulcería',
        '¿Cuáles son los horarios más baratos?',
        'Me interesa taquilla, ¿qué promociones hay?'
      ],
      
      'María Familia': [
        'Acepto términos y condiciones',
        greeting,
        'Somos una familia de 5 personas, ¿qué promociones tienen?',
        '¿Qué promociones tienen para niños?',
        'Buscamos combos familiares en dulcería',
        '¿Tienen descuentos para familias numerosas?',
        'Queremos ir 4 personas, ¿qué recomiendan?'
      ],
      
      'Andrea Romántica': [
        'Acepto términos y condiciones',
        greeting,
        'Quiero una experiencia especial para 2 personas',
        'Buscamos algo romántico, somos pareja',
        '¿Qué promociones tienen en dulcería para parejas?',
        'Queremos la mejor experiencia, ¿qué recomiendan?',
        '¿Tienen promociones especiales para citas?'
      ],
      
      'Roberto Clásico': [
        'Acepto términos y condiciones',
        greeting,
        '¿Tienen descuentos para adultos mayores?',
        'Somos un matrimonio mayor, ¿qué promociones hay?',
        'Buscamos funciones de mañana, ¿hay descuentos?',
        '¿Qué promociones tienen para 2 personas mayores?',
        'Preferimos dulcería, ¿qué ofertas tienen?'
      ],
      
      'David Cinéfilo': [
        'Acepto términos y condiciones',
        greeting,
        'Busco la mejor experiencia premium disponible',
        '¿Qué promociones tienen en salas VIP?',
        'Voy solo, ¿qué opciones premium hay?',
        'Quiero la mejor experiencia, somos 3 personas',
        '¿Tienen promociones especiales en dulcería gourmet?'
      ]
    };

    return commonQuestions[persona.name] || [greeting];
  }

  async generateDynamicQuestions(persona, count) {
    if (count <= 0) return [];

    const prompt = `
    Genera ${count} preguntas adicionales que haría ${persona.name}, un ${persona.demographic} de ${persona.age} años de ${persona.location}.

    Personalidad: ${persona.personality}

    Características importantes:
    - Presupuesto: ${persona.characteristics.budget}
    - Tamaño de grupo preferido: ${persona.characteristics.groupSize}
    - Intereses: ${persona.characteristics.interests.join(', ')}
    - Horarios preferidos: ${persona.characteristics.preferredTimes.join(', ')}

    Estilo de conversación:
    - Saludo: ${persona.conversationStyle.greeting}
    - Lenguaje: ${persona.conversationStyle.language}
    - Expresiones típicas: ${persona.conversationStyle.expressions.join(', ')}

    Las preguntas deben:
    1. Ser naturales y específicas para este tipo de persona mexicana
    2. Incluir preguntas sobre promociones de DULCERÍA o TAQUILLA específicamente
    3. Mencionar el número de personas que van (variar entre 1-6 según el perfil)
    4. Usar expresiones y lenguaje típico mexicano apropiado para la edad/demografía
    5. Incluir diferentes escenarios: horarios, ubicaciones, presupuestos
    6. Ser conversacionales, como si escribiera en WhatsApp

    Formato: Devuelve solo las preguntas, una por línea, sin numeración.
    `;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.8
      });

      const questions = response.choices[0].message.content
        .split('\n')
        .filter(q => q.trim() && !q.match(/^\d+\./))
        .map(q => q.trim())
        .slice(0, count);

      return questions;
    } catch (error) {
      console.error('Error generating dynamic questions:', error);
      return this.getFallbackQuestions(persona, count);
    }
  }

  getFallbackQuestions(persona, count) {
    const fallbackQuestions = {
      'Luis Estudiante': [
        '¿Hay promociones especiales para jóvenes?',
        'Vamos 2 personas, ¿qué combo recomiendan?',
        '¿Cuál es la promo más barata que tienen?',
        'Queremos dulcería, ¿qué está en oferta?',
        '¿Tienen descuentos entre semana?'
      ],
      'María Familia': [
        'Somos familia de 4, ¿qué nos conviene más?',
        '¿Tienen paquetes familiares completos?',
        'Los niños quieren dulces, ¿qué promociones hay?',
        '¿Hay descuentos para grupos grandes?',
        'Vamos 5 personas, ¿qué recomiendan?'
      ],
      'Andrea Romántica': [
        '¿Qué promoción romántica tienen disponible?',
        'Queremos algo especial para 2, ¿qué hay?',
        '¿Tienen combos para parejas?',
        'Buscamos una experiencia única',
        '¿Qué es lo más popular para citas?'
      ],
      'Roberto Clásico': [
        '¿Hay precios especiales en la mañana?',
        'Somos adultos mayores, ¿qué descuentos hay?',
        '¿Tienen promociones para la tercera edad?',
        'Preferimos horarios tempranos, ¿hay ofertas?',
        'Vamos mi esposa y yo, ¿qué nos conviene?'
      ],
      'David Cinéfilo': [
        '¿Cuál es su promoción más exclusiva?',
        '¿Tienen ofertas en experiencias premium?',
        'Busco calidad, no precio, ¿qué recomiendan?',
        '¿Qué promociones VIP están disponibles?',
        'Quiero la mejor experiencia posible'
      ]
    };

    const personaFallbacks = fallbackQuestions[persona.name] || [];
    return personaFallbacks.slice(0, count);
  }

  // Generate follow-up questions based on responses
  async generateFollowUpQuestion(persona, previousResponse, context) {
    const prompt = `
    Eres ${persona.name}, ${persona.demographic} de ${persona.age} años.
    
    Acabas de recibir esta respuesta del bot de Cinépolis: "${previousResponse}"
    
    Contexto de la conversación: ${context}
    
    Genera UNA pregunta de seguimiento natural que haría esta persona, considerando:
    - Su personalidad: ${persona.personality}
    - Su estilo de conversación: ${persona.conversationStyle.language}
    - Sus expresiones típicas: ${persona.conversationStyle.expressions.join(', ')}
    
    La pregunta debe ser específica sobre:
    - Detalles de la promoción mencionada
    - Aclarar sobre dulcería vs taquilla
    - Preguntar por número específico de personas
    - Pedir más información sobre los beneficios
    
    Responde SOLO con la pregunta, como si la escribieras en WhatsApp.
    `;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      return this.getGenericFollowUp(persona);
    }
  }

  getGenericFollowUp(persona) {
    const followUps = {
      'Luis Estudiante': [
        '¿Y esa promo para cuántas personas es?',
        'Órale, ¿y qué incluye exactamente?',
        '¿Esa es para dulcería o para taquilla?'
      ],
      'María Familia': [
        'Perfecto, ¿y para niños también aplica?',
        '¿Esa promoción es para toda la familia?',
        'Muchas gracias, ¿qué más incluye?'
      ],
      'Andrea Romántica': [
        'Genial, ¿y para 2 personas qué tal?',
        'Me encanta, ¿qué más detalles tiene?',
        'Súper, ¿es especial para parejas?'
      ],
      'Roberto Clásico': [
        'Muy amable, ¿y para personas mayores?',
        'Le agradezco, ¿qué requisitos tiene?',
        'Perfecto, ¿cuándo está disponible?'
      ],
      'David Cinéfilo': [
        'Excelente, ¿qué beneficios adicionales incluye?',
        'Impresionante, ¿es la mejor opción disponible?',
        'Notable, ¿qué otras opciones premium hay?'
      ]
    };

    const personaFollowUps = followUps[persona.name] || ['¿Me puede dar más detalles?'];
    return personaFollowUps[Math.floor(Math.random() * personaFollowUps.length)];
  }

  // Validate if persona got appropriate promotion based on their characteristics
  validatePromoForPersona(persona, promotionReceived) {
    const validations = {
      budget: {
        'low': ['Mac & Cheese Boneless', 'Touchdown Ruffles Dog', 'Mega Combo Baguis'],
        'medium': ['Mega Combo Baguis', 'Comboletos 1', 'Fiesta Cinépolis'],
        'medium-high': ['Comboletos 1', 'Fiesta Cinépolis', '10ª Temporada de Premios Cinépolis'],
        'high': ['Fiesta Cinépolis', '10ª Temporada de Premios Cinépolis']
      },
      groupSize: {
        'small': ['Mac & Cheese Boneless', 'Touchdown Ruffles Dog'],
        'couple': ['Mega Combo Baguis', 'Comboletos 1'],
        'large': ['Comboletos 1', 'Fiesta Cinépolis'],
        'senior': ['Mac & Cheese Boneless', 'Fiesta Cinépolis'],
        'flexible': ['Fiesta Cinépolis', '10ª Temporada de Premios Cinépolis']
      }
    };

    const budgetMatch = validations.budget[persona.characteristics.budget]?.includes(promotionReceived);
    const groupMatch = validations.groupSize[persona.characteristics.groupSize]?.includes(promotionReceived);

    return {
      budgetMatch: budgetMatch || false,
      groupMatch: groupMatch || false,
      overallMatch: budgetMatch && groupMatch
    };
  }
}