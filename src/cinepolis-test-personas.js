export const CINEPOLIS_PERSONAS = [
  {
    id: 'joven_estudiante',
    name: 'Luis Estudiante',
    age: 22,
    demographic: 'Joven universitario',
    language: 'es',
    location: 'CDMX',
    personality: 'Entusiasta del cine, presupuesto limitado, le gustan las promociones',
    characteristics: {
      budget: 'low',
      groupSize: 'small', // 1-2 personas
      interests: ['acción', 'comedia', 'superhéroes'],
      preferredTimes: ['tarde', 'noche'],
      priceConscious: true,
      techSavvy: true
    },
    conversationStyle: {
      greeting: 'casual',
      language: 'coloquial mexicano',
      expressions: ['órale', 'está padrísimo', 'qué onda', 'está chido'],
      questions: [
        'sobre precios',
        'descuentos para estudiantes',
        'promociones de dulcería',
        'horarios económicos'
      ]
    },
    scenarios: [
      'Quiere ir al cine con su novia',
      'Busca promociones de taquilla',
      'Prefiere dulcería barata',
      'Pregunta por descuentos estudiantiles',
      'Quiere ver películas de estreno'
    ]
  },
  
  {
    id: 'familia_tradicional',
    name: 'María Familia',
    age: 38,
    demographic: 'Madre de familia',
    language: 'es',
    location: 'Estado de México',
    personality: 'Cariñosa, busca entretenimiento familiar, preocupada por el presupuesto',
    characteristics: {
      budget: 'medium',
      groupSize: 'large', // 4-6 personas
      interests: ['familiar', 'animación', 'aventura'],
      preferredTimes: ['matinée', 'tarde'],
      priceConscious: true,
      familyOriented: true
    },
    conversationStyle: {
      greeting: 'formal pero cálido',
      language: 'educado, mexicano tradicional',
      expressions: ['por favor', 'muchas gracias', 'qué bonito', 'perfecto'],
      questions: [
        'sobre funciones familiares',
        'promociones para niños',
        'combos familiares',
        'películas apropiadas para niños'
      ]
    },
    scenarios: [
      'Planea salida familiar el fin de semana',
      'Busca promociones para 4-5 personas',
      'Quiere combos de dulcería familiares',
      'Pregunta por películas aptas para niños',
      'Busca horarios de matinée'
    ]
  },

  {
    id: 'pareja_joven',
    name: 'Andrea Romántica',
    age: 28,
    demographic: 'Mujer joven profesionista',
    language: 'es',
    location: 'Guadalajara',
    personality: 'Romántica, le gusta planear citas especiales, dispuesta a gastar en experiencias',
    characteristics: {
      budget: 'medium-high',
      groupSize: 'couple', // 2 personas
      interests: ['romance', 'drama', 'thriller'],
      preferredTimes: ['noche', 'fines de semana'],
      priceConscious: false,
      experienceOriented: true
    },
    conversationStyle: {
      greeting: 'amigable',
      language: 'moderno, urban mexicano',
      expressions: ['genial', 'perfecto', 'me encanta', 'súper'],
      questions: [
        'sobre experiencias VIP',
        'mejores asientos',
        'promociones románticas',
        'estrenos especiales'
      ]
    },
    scenarios: [
      'Planea cita romántica con su novio',
      'Busca experiencia premium en cine',
      'Quiere ver estrenos en su primera semana',
      'Pregunta por salas VIP o premium',
      'Busca promociones especiales para parejas'
    ]
  },

  {
    id: 'senior_tradicional',
    name: 'Roberto Clásico',
    age: 65,
    demographic: 'Adulto mayor jubilado',
    language: 'es',
    location: 'Puebla',
    personality: 'Tradicional, le gusta el cine clásico, prefiere horarios temprano',
    characteristics: {
      budget: 'medium',
      groupSize: 'senior', // 2-3 personas (esposa, amigos)
      interests: ['drama', 'clásicos', 'biografías'],
      preferredTimes: ['matinée', 'tarde temprano'],
      priceConscious: true,
      traditionalValues: true
    },
    conversationStyle: {
      greeting: 'muy formal',
      language: 'formal mexicano tradicional',
      expressions: ['buenos días', 'muy amable', 'por favor', 'le agradezco'],
      questions: [
        'sobre descuentos para adultos mayores',
        'horarios de matinée',
        'películas clásicas',
        'facilidades de acceso'
      ]
    },
    scenarios: [
      'Busca descuentos para adultos mayores',
      'Prefiere funciones de matinée',
      'Quiere ver películas con subtítulos',
      'Pregunta por facilidades de acceso',
      'Busca promociones para personas mayores'
    ]
  },

  {
    id: 'cinefilo_premium',
    name: 'David Cinéfilo',
    age: 35,
    demographic: 'Profesionista amante del cine',
    language: 'es',
    location: 'Monterrey',
    personality: 'Conocedor de cine, busca la mejor experiencia, dispuesto a pagar por calidad',
    characteristics: {
      budget: 'high',
      groupSize: 'flexible', // 1-4 personas
      interests: ['arte', 'independiente', 'internacional', 'premium'],
      preferredTimes: ['flexible'],
      priceConscious: false,
      qualityOriented: true
    },
    conversationStyle: {
      greeting: 'conocedor',
      language: 'culto pero accesible',
      expressions: ['excelente', 'magistral', 'impresionante', 'notable'],
      questions: [
        'sobre tecnología de salas',
        'estrenos internacionales',
        'festivales de cine',
        'experiencias premium'
      ]
    },
    scenarios: [
      'Busca la mejor experiencia de audio/video',
      'Quiere ver estrenos limitados o independientes',
      'Pregunta por salas premium o IMAX',
      'Busca información sobre festivales',
      'Dispuesto a pagar por experiencias exclusivas'
    ]
  }
];

export default class CinepolisTestPersonas {
  constructor() {
    this.personas = CINEPOLIS_PERSONAS;
  }

  getPersonas() {
    return this.personas;
  }

  getPersonaById(id) {
    return this.personas.find(p => p.id === id);
  }

  getPersonasByDemographic(demographic) {
    return this.personas.filter(p => p.demographic.includes(demographic));
  }

  getPersonasByBudget(budget) {
    return this.personas.filter(p => p.characteristics.budget === budget);
  }

  getPersonasByGroupSize(groupSize) {
    return this.personas.filter(p => p.characteristics.groupSize === groupSize);
  }

  // Generate persona-specific greeting
  generatePersonaGreeting(persona) {
    const greetings = {
      'Luis Estudiante': [
        '¡Órale! ¿Qué onda? Quiero ir al cine',
        'Hola, ¿qué tal? Busco promociones para estudiantes',
        '¿Qué hay de nuevo en cartelera? Soy estudiante'
      ],
      'María Familia': [
        'Buenos días. Busco información para ir al cine en familia',
        'Hola, ¿me puede ayudar? Quiero llevar a mis hijos al cine',
        'Buenos días, ¿qué promociones tienen para familias?'
      ],
      'Andrea Romántica': [
        'Hola! Quiero planear una cita especial en el cine',
        '¡Hola! Busco algo romántico para ver con mi novio',
        'Hola, ¿qué recomiendan para una cita en el cine?'
      ],
      'Roberto Clásico': [
        'Buenos días. ¿Me puede informar sobre las funciones de la mañana?',
        'Buen día, ¿qué descuentos tienen para adultos mayores?',
        'Buenos días, busco información sobre horarios de matinée'
      ],
      'David Cinéfilo': [
        'Saludos. Me interesa conocer las mejores salas disponibles',
        'Hola, busco información sobre estrenos internacionales',
        'Buenos días, ¿qué experiencias premium ofrecen?'
      ]
    };

    const personaGreetings = greetings[persona.name] || ['Hola, ¿cómo están?'];
    return personaGreetings[Math.floor(Math.random() * personaGreetings.length)];
  }

  // Generate persona-specific follow-up expressions
  generatePersonaExpression(persona, context = 'general') {
    const expressions = persona.conversationStyle.expressions;
    return expressions[Math.floor(Math.random() * expressions.length)];
  }
}