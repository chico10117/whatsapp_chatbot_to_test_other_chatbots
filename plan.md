
Perfect! I'll create a comprehensive plan to transform the current bot into "botty" - a WhatsApp bot tester for Reco. Here's the detailed plan:

## 🤖 BOTTY - WhatsApp Bot Testing System for RECO

### 📋 **Project Overview**

Transform the current WhatsApp bot into an automated testing system that will:
- Connect to Reco bot at +593 99 417 0801
- Simulate 5 different user personas
- Send 75 questions total (15 per persona)
- Generate a comprehensive feedback report

### 🏗️ **Architecture Plan**

```
Current Structure → New Structure
├── index.js         → botty.js (main testing orchestrator)
├── prompt.js        → test-personas.js (persona definitions & questions)
├── [removed]        → test-results.js (logging & analysis)
└── [removed]        → feedback-generator.js (final report)
```

### 👥 **User Personas & Question Sets**

#### **1. Usuario Consciente de la Salud (Health-Conscious User)**
```javascript
{
  name: "María Fitness",
  language: "es",
  questions: [
    "Hola, busco restaurantes con opciones veganas en el centro de Madrid",
    "¿Qué lugares tienen ensaladas frescas cerca de Sol?",
    "Necesito un restaurante con menú bajo en calorías",
    "¿Conoces sitios con jugos naturales y smoothies?",
    "Busco opciones sin gluten en Malasaña",
    "¿Qué restaurante tiene las mejores opciones proteicas?",
    "¿Dónde puedo encontrar bowls de açaí?",
    "Necesito un lugar con opciones keto-friendly",
    "¿Hay restaurantes con información nutricional en el menú?",
    "Busco brunch saludable para el domingo",
    "¿Conoces lugares con opciones crudiveganas?",
    "¿Qué sitio recomiendas para comer después del gym?",
    "Necesito opciones sin azúcar añadida",
    "¿Dónde sirven quinoa y superalimentos?",
    "Busco restaurantes con certificación orgánica"
  ]
}
```

#### **2. Usuario Consciente del Presupuesto (Budget-Conscious User)**
```javascript
{
  name: "Carlos Estudiante",
  language: "es",
  questions: [
    "Busco menús del día por menos de 12 euros",
    "¿Dónde está el kebab más barato de Madrid?",
    "Necesito sitios con descuentos para estudiantes",
    "¿Qué restaurantes tienen happy hour?",
    "Busco pizzerías con ofertas 2x1",
    "¿Conoces buffets libres económicos?",
    "¿Dónde puedo comer bien por 8 euros?",
    "Necesito tapas baratas en La Latina",
    "¿Qué sitios tienen menú ejecutivo económico?",
    "Busco bocadillos grandes y baratos",
    "¿Hay restaurantes con primera consumición gratis?",
    "¿Dónde encuentro raciones para compartir baratas?",
    "Necesito desayunos completos por menos de 5 euros",
    "¿Conoces sitios con descuento al llevar?",
    "Busco comida rápida económica cerca de la universidad"
  ]
}
```

#### **3. Familia con Niños (Family with Kids)**
```javascript
{
  name: "Ana Familia",
  language: "es",
  questions: [
    "Busco restaurantes con zona de juegos para niños",
    "¿Qué sitios tienen menú infantil en Pozuelo?",
    "Necesito restaurantes con tronas y cambiador",
    "¿Dónde puedo celebrar un cumpleaños infantil?",
    "Busco pizzerías familiares con actividades para niños",
    "¿Conoces restaurantes con animación los domingos?",
    "¿Qué lugares son buenos para ir con bebés?",
    "Necesito sitios con terraza segura para niños",
    "¿Dónde tienen opciones sin picante para niños?",
    "Busco heladerías con opciones sin azúcar",
    "¿Qué restaurantes abren temprano para merendar?",
    "¿Conoces buffets donde los niños comen gratis?",
    "Necesito lugares con parking para carritos",
    "¿Dónde hacen talleres de cocina para niños?",
    "Busco restaurantes temáticos para familias"
  ]
}
```

#### **4. UK Tourist (English Questions)**
```javascript
{
  name: "James Tourist",
  language: "en",
  questions: [
    "Hi, where can I find authentic Spanish tapas near Plaza Mayor?",
    "What's the best paella restaurant in Madrid?",
    "I need restaurants with English menus",
    "Where can I find a good Full English Breakfast?",
    "Looking for michelin star restaurants",
    "What restaurants are open late night?",
    "Where's the best sangria in the city?",
    "Need vegetarian-friendly Spanish restaurants",
    "What's good near the Prado Museum?",
    "Where do locals eat, not tourist traps?",
    "Best rooftop restaurants with views?",
    "Where can I try authentic jamón ibérico?",
    "Need gluten-free options near my hotel in Gran Vía",
    "What's open on Sundays?",
    "Where can I book a flamenco dinner show?"
  ]
}
```

#### **5. Foodie/Aventurero Gastronómico (Foodie/Adventurous Eater)**
```javascript
{
  name: "Diego Gourmet",
  language: "es",
  questions: [
    "Busco restaurantes de cocina molecular en Madrid",
    "¿Dónde puedo probar insectos comestibles?",
    "Necesito sitios con menú degustación con maridaje",
    "¿Qué restaurantes tienen chef con estrella Michelin?",
    "Busco cocina fusión nikkei peruana",
    "¿Conoces lugares con experiencias gastronómicas inmersivas?",
    "¿Dónde sirven ramen auténtico japonés?",
    "Necesito restaurantes con cocina de autor",
    "¿Qué sitios tienen ingredientes exóticos?",
    "Busco pop-ups gastronómicos este mes",
    "¿Dónde puedo probar cocina etíope auténtica?",
    "¿Conoces restaurantes con fermentados artesanales?",
    "Necesito sitios especializados en mariscos raros",
    "¿Qué lugares hacen catas de sake?",
    "Busco experiencias de omakase en Madrid"
  ]
}
```

### 🔧 **Implementation Strategy**

#### **Phase 1: Core Testing Engine**
```javascript
// botty.js structure
class BotTester {
  constructor() {
    this.recoNumber = '+593994170801';
    this.personas = [];
    this.currentPersona = 0;
    this.currentQuestion = 0;
    this.testResults = [];
  }

  async startTesting() {
    // Initialize connection
    // Loop through personas
    // Send questions sequentially
    // Log responses
    // Generate final report
  }
}
```

#### **Phase 2: Response Analysis System**
```javascript
// Analyze each response for:
- Response time
- Message completeness
- Language consistency
- Recommendation relevance
- Error handling
```

#### **Phase 3: Logging Structure**
```javascript
{
  personaId: "health_conscious",
  questionNumber: 1,
  question: "...",
  sentAt: timestamp,
  response: "...",
  receivedAt: timestamp,
  responseTime: seconds,
  responseType: "text|media|buttons",
  analysis: {
    hasRecommendation: boolean,
    languageCorrect: boolean,
    relevanceScore: 1-5
  }
}
```

### 📊 **Final Feedback Structure**

```javascript
MENSAJE FINAL - REPORTE DE PRUEBA RECO BOT

📈 MÉTRICAS GENERALES:
- Total de preguntas: 75
- Respuestas recibidas: X/75
- Tiempo promedio de respuesta: X segundos
- Tasa de éxito: X%

🎯 PRECISIÓN DE RECOMENDACIONES (por persona):
1. María Fitness: X/5 ⭐
2. Carlos Estudiante: X/5 ⭐
3. Ana Familia: X/5 ⭐
4. James Tourist: X/5 ⭐
5. Diego Gourmet: X/5 ⭐

🗣️ CALIDAD DE LENGUAJE:
- Consistencia en español: X%
- Consistencia en inglés: X%
- Errores gramaticales detectados: X
- Tono apropiado: ✓/✗

⚠️ MANEJO DE CASOS LÍMITE:
- Preguntas ambiguas: X/Y manejadas
- Solicitudes no relacionadas: X/Y rechazadas
- Errores recuperados: X

🔄 FLUJO DE EXPERIENCIA:
- Claridad en respuestas: X/5
- Facilidad de uso: X/5
- Información completa: X/5
- Sugerencias adicionales: X/5

💡 RECOMENDACIONES:
[Lista de mejoras sugeridas basadas en el análisis]
```

### 📁 **File Structure Changes**

```
whatsapp_chatbot_to_test_other_chatbots/
├── botty.js                 # Main testing orchestrator
├── test-personas.js         # Persona definitions and questions
├── test-executor.js         # Question sending logic
├── response-analyzer.js     # Response analysis engine
├── feedback-generator.js    # Final report generator
├── test-logs/              # Directory for conversation logs
│   ├── health_conscious.json
│   ├── budget_conscious.json
│   ├── family_kids.json
│   ├── uk_tourist.json
│   └── foodie.json
├── package.json            # Updated dependencies
└── .env                    # Configuration
```

### 🚀 **Execution Flow**

1. **Initialize** → Connect to WhatsApp
2. **Start Test** → Send first message to Reco
3. **Persona Loop** → For each persona:
   - Send introduction
   - Ask 15 questions sequentially
   - Wait for responses
   - Log everything
4. **Analysis** → Process all responses
5. **Generate Report** → Create final feedback message
6. **Send Report** → Send "Mensaje final" to Reco

### ⏰ **Timeline Estimate**

- **Phase 1**: Core structure refactoring (2-3 hours)
- **Phase 2**: Persona implementation (1-2 hours)
- **Phase 3**: Response analysis (2-3 hours)
- **Phase 4**: Report generation (1-2 hours)
- **Testing**: Full system test (1 hour)

**Total: ~8-11 hours of development**

This plan provides a complete transformation of the current bot into an automated testing system for Reco. Should I proceed with the implementation?
