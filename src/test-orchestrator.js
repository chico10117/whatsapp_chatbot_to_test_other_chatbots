import { AI_PERSONAS } from './test-personas.js';
import AIConversationGenerator from './ai-conversation-generator.js';
import TestLogger from './test-logger.js';
import { delay } from '@whiskeysockets/baileys';

export default class TestOrchestrator {
  constructor() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.logger = new TestLogger();
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
    this.responseCallback = null;
    this.testId = `test_${Date.now()}`;
    this.aiGenerator = new AIConversationGenerator();
    this.questionGenerationTimes = []; // ms durations for generated questions
    this.globalTotalQuestions = 0;
    this.globalQuestionCounter = 0;
  }

  async executeAllPersonas(whatsappClient, recoNumber) {
    this.logger.logTestStart(this.testId);
    const testStartTime = Date.now();
    this.globalTotalQuestions = Object.values(AI_PERSONAS).reduce((sum, p) => sum + (p.maxQuestions || 15), 0);
    this.globalQuestionCounter = 0;
    
    try {
      for (const [personaId, persona] of Object.entries(AI_PERSONAS)) {
        console.log(`\n🎭 Starting AI-powered conversation with ${persona.name}`);
        console.log(`   📋 Profile: ${persona.description}`);
        console.log(`   🎯 Language: ${persona.language.toUpperCase()}`);
        console.log(`   📊 Target: ${persona.maxQuestions} dynamic questions`);
        
        this.logger.logPersonaStart(persona);
        await this.executePersona(whatsappClient, recoNumber, persona);
        
        // Wait between personas to avoid overwhelming Reco
        console.log(`   ⏸️  Waiting 5 seconds before next persona...`);
        await delay(5000);
      }
      
      const totalDuration = Date.now() - testStartTime;
      const totalQuestions = this.testResults.reduce((sum, persona) => sum + persona.questions.length, 0);
      const totalResponses = this.testResults.reduce((sum, persona) => 
        sum + persona.questions.filter(q => q.response).length, 0);
      
      this.logger.logTestComplete(totalDuration, totalQuestions, totalResponses);
      
      // Save complete test results
      await this.logger.saveFullTestResults(this.testResults);
      
      return this.testResults;
    } catch (error) {
      this.logger.logError('executeAllPersonas', error);
      throw error;
    }
  }

  async executePersona(whatsappClient, recoNumber, persona) {
    this.currentPersona = persona;
    this.currentQuestionIndex = 0;
    const personaStartTime = Date.now();
    
    const personaResults = {
      personaId: persona.id,
      personaName: persona.name,
      language: persona.language,
      description: persona.description,
      startTime: new Date(),
      questions: [],
      summary: {},
      conversationType: 'AI_GENERATED'
    };

    try {
      // Reset conversation history for this persona
      this.aiGenerator.resetConversation(persona.id);
      
      // Generate and send initial question
       console.log(`   🤖 Generating initial question for ${persona.name}...`);
       const genStartInitial = Date.now();
       const initialQuestion = await this.aiGenerator.generateInitialQuestion(persona);
       const genDurationInitial = Date.now() - genStartInitial;
       this.logger.logQuestionGenerated(persona, 1, genDurationInitial, 'initial');
       this.questionGenerationTimes.push(genDurationInitial);
      
      console.log(`   💭 ${persona.name}: "${initialQuestion}"`);
      
      // Send initial question
      const questionResult = await this.sendQuestionAndWaitResponse(
        whatsappClient, 
        recoNumber, 
        initialQuestion, 
        1,
        ++this.globalQuestionCounter,
        this.globalTotalQuestions,
        persona
      );
      
      personaResults.questions.push(questionResult);
      this.currentQuestionIndex = 1;
      
      // Continue conversation with AI-generated follow-ups
      while (this.currentQuestionIndex < persona.maxQuestions) {
        // Only generate follow-up if we got a response
        if (!questionResult.response && this.currentQuestionIndex === 1) {
          console.log(`   ⚠️  No response to initial question, ending conversation for ${persona.name}`);
          break;
        }
        
        const lastResponse = personaResults.questions[personaResults.questions.length - 1].response;
        
        // Check if we got no response or an error response
        if (!lastResponse || this.isErrorResponse(lastResponse)) {
          if (!lastResponse) {
            console.log(`   ⚠️  No response received, ending conversation for ${persona.name}`);
          } else {
            console.log(`   ⚠️  Error response received: "${lastResponse}", ending conversation for ${persona.name}`);
          }
          break;
        }
        
        // Generate follow-up question based on Reco's response
         console.log(`   🤖 Generating follow-up question ${this.currentQuestionIndex + 1}...`);
         const genStart = Date.now();
         const followUpQuestion = await this.aiGenerator.generateFollowUpQuestion(
          persona, 
          lastResponse, 
          this.currentQuestionIndex
        );
         const genDuration = Date.now() - genStart;
         this.logger.logQuestionGenerated(persona, this.currentQuestionIndex + 1, genDuration, 'follow-up');
         this.questionGenerationTimes.push(genDuration);
        
        if (!followUpQuestion) {
          console.log(`   ✅ Conversation complete for ${persona.name}`);
          break;
        }
        
        console.log(`   💭 ${persona.name}: "${followUpQuestion}"`);
        
        // Send follow-up question
        const followUpResult = await this.sendQuestionAndWaitResponse(
          whatsappClient, 
          recoNumber, 
          followUpQuestion, 
          this.currentQuestionIndex + 1,
          ++this.globalQuestionCounter,
          this.globalTotalQuestions,
          persona
        );
        
        personaResults.questions.push(followUpResult);
        this.currentQuestionIndex++;
        
        // Add delay between questions to be respectful
         if (this.currentQuestionIndex < persona.maxQuestions) {
           console.log(`   ⏳ Waiting 1 second before next question...`);
           await delay(1000);
         }
      }
      
      personaResults.endTime = new Date();
      personaResults.duration = personaResults.endTime - personaResults.startTime;
      
      // Log persona completion
      const personaDuration = Date.now() - personaStartTime;
      const questionsAsked = personaResults.questions.length;
      const responsesReceived = personaResults.questions.filter(q => q.response).length;
      
      console.log(`   ✅ ${persona.name} completed: ${questionsAsked} questions, ${responsesReceived} responses`);
      this.logger.logPersonaComplete(persona, personaDuration);
      
      this.testResults.push(personaResults);
      
      // Save individual persona results
      await this.logger.savePersonaResults(personaResults);
      
      return personaResults;
    } catch (error) {
      this.logger.logError(`executePersona-${persona.name}`, error);
      throw error;
    }
  }

  async sendQuestionAndWaitResponse(whatsappClient, recoNumber, question, questionNumber, globalIndex, globalTotal, persona) {
    const sentTime = new Date();
    
    try {
      // Send question to Reco
      await whatsappClient.sendMessage(recoNumber, { text: question });
      console.log(`   📤 Message sent, waiting for RECO response...`);
      // Log with per-persona and global progression
      this.logger.logQuestionSent(questionNumber, question, persona, globalIndex, globalTotal);
      
      // Set up response waiting mechanism
      this.isWaitingForResponse = true;
      this.lastMessageTime = sentTime;
      
      const questionResult = {
        questionNumber,
        question,
        sentAt: sentTime,
        response: null,
        receivedAt: null,
        responseTime: null,
        analysis: {},
        isAIGenerated: true
      };
      
      // Wait for response with timeout
      const timeoutMs = process.env.TEST_TIMEOUT_MS || 120000; // 30 seconds default
      console.log(`   ⏱️  Waiting up to ${timeoutMs/1000}s for response...`);
      
      const response = await this.waitForResponse(timeoutMs);
      
      if (response) {
        questionResult.response = response.text;
        questionResult.receivedAt = response.timestamp;
        questionResult.responseTime = response.timestamp - sentTime;
        console.log(`   ✅ Response received in ${(questionResult.responseTime/1000).toFixed(1)}s`);
        console.log(`   🤖 RECO: "${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`   ⏰ No response received within timeout period`);
      }
      
      // Ensure we're no longer waiting before proceeding
      this.isWaitingForResponse = false;
      
      return questionResult;
    } catch (error) {
      this.logger.logError(`sendQuestion-${questionNumber}`, error);
      this.isWaitingForResponse = false;
      
      return {
        questionNumber,
        question,
        sentAt: sentTime,
        response: null,
        receivedAt: null,
        responseTime: null,
        analysis: {},
        error: error.message,
        isAIGenerated: true
      };
    }
  }

  async waitForResponse(timeoutMs) {
    return new Promise((resolve) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        console.log(`   ⌛ Timeout reached, proceeding to next question`);
        this.responseCallback = null;
        resolve(null); // No response received
      }, timeoutMs);
      
      // This will be called by the message handler when response is received
      this.responseCallback = (response) => {
        console.log(`   📨 RECO response received, proceeding to next question`);
        clearTimeout(timeout);
        this.responseCallback = null;
        resolve(response);
      };
      
      console.log(`   👂 Listening for RECO response...`);
    });
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

  handleIncomingMessage(message) {
    // Only process messages when we're actively waiting for a response
    if (this.isWaitingForResponse && this.responseCallback) {
      console.log(`   📥 Incoming message from RECO detected`);
      
      // Extract text from different message types
      let messageText = '';
      
      if (message.message?.conversation) {
        messageText = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        messageText = message.message.extendedTextMessage.text;
      } else if (message.message?.buttonsResponseMessage?.selectedDisplayText) {
        messageText = message.message.buttonsResponseMessage.selectedDisplayText;
      } else if (message.message?.listResponseMessage?.title) {
        messageText = message.message.listResponseMessage.title;
      } else if (message.message?.imageMessage?.caption) {
        messageText = message.message.imageMessage.caption || '[Image message]';
      } else if (message.message?.videoMessage?.caption) {
        messageText = message.message.videoMessage.caption || '[Video message]';
      } else if (message.message?.audioMessage) {
        messageText = '[Audio message]';
      } else if (message.message?.documentMessage?.fileName) {
        messageText = `[Document: ${message.message.documentMessage.fileName}]`;
      } else {
        // Fallback for unknown message types
        messageText = JSON.stringify(message.message);
      }
      
      const response = {
        text: messageText,
        timestamp: new Date(),
        messageType: this.getMessageType(message),
        rawMessage: message.message
      };
      
      // Trigger the response callback
      this.responseCallback(response);
    } else {
      console.log(`   ℹ️  Received message from RECO but not currently waiting (ignoring)`);
    }
  }

  getMessageType(message) {
    if (message.message?.conversation) return 'text';
    if (message.message?.extendedTextMessage) return 'extended_text';
    if (message.message?.buttonsResponseMessage) return 'button_response';
    if (message.message?.listResponseMessage) return 'list_response';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    return 'unknown';
  }

  getCurrentStatus() {
    return {
      testId: this.testId,
      isActive: this.isWaitingForResponse,
      currentPersona: this.currentPersona?.name || null,
      currentQuestion: this.currentQuestionIndex + 1,
      totalCompleted: this.testResults.length,
      totalPersonas: Object.keys(AI_PERSONAS).length,
      conversationType: 'AI_GENERATED'
    };
  }

  getAverageQuestionGenerationMs() {
    if (!this.questionGenerationTimes.length) return 0;
    const total = this.questionGenerationTimes.reduce((sum, n) => sum + n, 0);
    return total / this.questionGenerationTimes.length;
  }

  reset() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
    this.responseCallback = null;
    this.testId = `test_${Date.now()}`;
    
    // Reset AI conversation histories
    if (this.aiGenerator) {
      Object.keys(AI_PERSONAS).forEach(personaId => {
        this.aiGenerator.resetConversation(personaId);
      });
    }
    
    console.log(`🔄 Test orchestrator reset with AI conversation generator`);
  }
} 