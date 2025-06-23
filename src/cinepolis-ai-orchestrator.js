import { CINEPOLIS_AI_PERSONAS } from './cinepolis-ai-personas.js';
import CinepolisAIConversationGenerator from './cinepolis-ai-conversation-generator.js';
import TestLogger from './test-logger.js';
import { delay } from '@whiskeysockets/baileys';

export default class CinepolisAIOrchestrator {
  constructor() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.logger = new TestLogger();
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
    this.responseCallback = null;
    this.testId = `cinepolis_test_${Date.now()}`;
    this.aiGenerator = new CinepolisAIConversationGenerator();
  }

  async executeAllPersonas(whatsappClient, palomaNumber) {
    this.logger.logTestStart(this.testId);
    const testStartTime = Date.now();
    
    try {
      for (const [personaId, persona] of Object.entries(CINEPOLIS_AI_PERSONAS)) {
        console.log(`\n🎭 Starting AI-powered cinema conversation with ${persona.name}`);
        console.log(`   📋 Profile: ${persona.description}`);
        console.log(`   🎯 Language: ${persona.language.toUpperCase()}`);
        console.log(`   🎬 Preferences: ${persona.cinemaPreferences.groupSize}, ${persona.cinemaPreferences.budget} budget`);
        console.log(`   📊 Target: ${persona.maxQuestions} dynamic questions`);
        
        this.logger.logPersonaStart(persona);
        await this.executePersona(whatsappClient, palomaNumber, persona);
        
        // Wait between personas to avoid overwhelming Paloma
        console.log(`   ⏸️  Waiting 10 seconds before next persona...`);
        await delay(10000);
      }
      
      const totalDuration = Date.now() - testStartTime;
      const totalQuestions = this.testResults.reduce((sum, persona) => sum + persona.questions.length, 0);
      const totalResponses = this.testResults.reduce((sum, persona) => 
        sum + persona.questions.filter(q => q.response).length, 0);
      const totalQRs = this.testResults.reduce((sum, persona) => 
        sum + persona.questions.filter(q => q.receivedQR).length, 0);
      
      this.logger.logTestComplete(totalDuration, totalQuestions, totalResponses);
      
      console.log(`\n🎉 CINÉPOLIS TEST COMPLETED!`);
      console.log(`   📊 Total Questions: ${totalQuestions}`);
      console.log(`   📥 Total Responses: ${totalResponses}`);
      console.log(`   🎁 Total QR Codes: ${totalQRs}`);
      console.log(`   ⏱️  Total Duration: ${Math.round(totalDuration/1000/60)} minutes`);
      
      // Save complete test results
      await this.logger.saveFullTestResults(this.testResults);
      
      return this.testResults;
    } catch (error) {
      this.logger.logError('executeAllPersonas', error);
      throw error;
    }
  }

  async executePersona(whatsappClient, palomaNumber, persona) {
    this.currentPersona = persona;
    this.currentQuestionIndex = 0;
    const personaStartTime = Date.now();
    
    const personaResults = {
      personaId: persona.id,
      personaName: persona.name,
      language: persona.language,
      description: persona.description,
      cinemaPreferences: persona.cinemaPreferences,
      startTime: new Date(),
      questions: [],
      summary: {},
      conversationType: 'AI_GENERATED_CINEMA'
    };

    try {
      // Reset conversation history for this persona
      this.aiGenerator.resetConversation(persona.id);
      
      // Generate and send initial question (terms acceptance)
      console.log(`   🤖 Generating initial message for ${persona.name}...`);
      const initialQuestion = await this.aiGenerator.generateInitialQuestion(persona);
      
      console.log(`   💭 ${persona.name}: "${initialQuestion}"`);
      
      // Send initial question
      const questionResult = await this.sendQuestionAndWaitResponse(
        whatsappClient, 
        palomaNumber, 
        initialQuestion, 
        1
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
        if (!lastResponse) {
          console.log(`   ⚠️  No response received, ending conversation for ${persona.name}`);
          break;
        }
        
        // Generate follow-up question based on Paloma's response
        console.log(`   🤖 Generating follow-up question ${this.currentQuestionIndex + 1}...`);
        const followUpQuestion = await this.aiGenerator.generateFollowUpQuestion(
          persona, 
          lastResponse, 
          this.currentQuestionIndex
        );
        
        if (!followUpQuestion) {
          console.log(`   ✅ Conversation complete for ${persona.name}`);
          break;
        }
        
        console.log(`   💭 ${persona.name}: "${followUpQuestion}"`);
        
        // Send follow-up question
        const followUpResult = await this.sendQuestionAndWaitResponse(
          whatsappClient, 
          palomaNumber, 
          followUpQuestion, 
          this.currentQuestionIndex + 1
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
      const qrCodesReceived = personaResults.questions.filter(q => q.receivedQR).length;
      
      console.log(`   ✅ ${persona.name} completed: ${questionsAsked} questions, ${responsesReceived} responses, ${qrCodesReceived} QRs`);
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

  async sendQuestionAndWaitResponse(whatsappClient, palomaNumber, question, questionNumber) {
    const sentTime = new Date();
    
    try {
      // Send question to Paloma
      await whatsappClient.sendMessage(palomaNumber, { text: question });
      console.log(`   📤 Message sent, waiting for PALOMA response...`);
      
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
        receivedQR: false,
        qrType: null,
        analysis: {},
        isAIGenerated: true
      };
      
      // Wait for response with timeout
      const timeoutMs = process.env.TEST_TIMEOUT_MS || 30000; // 30 seconds default
      console.log(`   ⏱️  Waiting up to ${timeoutMs/1000}s for response...`);
      
      const response = await this.waitForResponse(timeoutMs);
      
      if (response) {
        questionResult.response = response.text;
        questionResult.receivedAt = response.timestamp;
        questionResult.responseTime = response.timestamp - sentTime;
        questionResult.receivedQR = response.hasQR || false;
        questionResult.qrType = response.qrType || null;
        
        console.log(`   ✅ Response received in ${(questionResult.responseTime/1000).toFixed(1)}s`);
        console.log(`   🤖 PALOMA: "${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}"`);
        
        if (response.hasQR) {
          console.log(`   🎁 QR Code received! Type: ${response.qrType || 'unknown'}`);
        }
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
        receivedQR: false,
        qrType: null,
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
        console.log(`   📨 Cinépolis bot response received, proceeding...`);
        clearTimeout(timeout);
        this.responseCallback = null;
        resolve(response);
      };
      
      console.log(`   👂 Listening for Cinépolis bot response...`);
    });
  }

  handleIncomingMessage(message) {
    // Only process messages when we're actively waiting for a response
    if (this.isWaitingForResponse && this.responseCallback) {
      console.log(`   📨 Processing response from Cinépolis bot...`);
      
      // Extract text from different message types
      let messageText = '';
      let hasQR = false;
      let qrType = null;
      
      if (message.message?.conversation) {
        messageText = message.message.conversation;
      } else if (message.message?.extendedTextMessage?.text) {
        messageText = message.message.extendedTextMessage.text;
      } else if (message.message?.imageMessage) {
        hasQR = true;
        messageText = message.message.imageMessage.caption || '[QR Code Image]';
        
        // Try to identify QR type from caption
        if (messageText.toLowerCase().includes('promoción') || messageText.toLowerCase().includes('qr')) {
          qrType = 'promotion';
        }
      } else if (message.message?.buttonsResponseMessage?.selectedDisplayText) {
        messageText = message.message.buttonsResponseMessage.selectedDisplayText;
      } else if (message.message?.listResponseMessage?.title) {
        messageText = message.message.listResponseMessage.title;
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
        hasQR: hasQR,
        qrType: qrType,
        rawMessage: message.message
      };
      
      // Trigger the response callback to proceed with next question
      console.log(`   ✅ Cinépolis bot response processed, generating next question...`);
      this.responseCallback(response);
    } else {
      console.log(`   ⚠️  Received message from Cinépolis but not currently waiting (ignoring)`);
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
      totalPersonas: Object.keys(CINEPOLIS_AI_PERSONAS).length,
      conversationType: 'AI_GENERATED_CINEMA'
    };
  }

  reset() {
    this.currentPersona = null;
    this.currentQuestionIndex = 0;
    this.testResults = [];
    this.isWaitingForResponse = false;
    this.lastMessageTime = null;
    this.responseCallback = null;
    this.testId = `cinepolis_test_${Date.now()}`;
    
    // Reset AI conversation histories
    if (this.aiGenerator) {
      Object.keys(CINEPOLIS_AI_PERSONAS).forEach(personaId => {
        this.aiGenerator.resetConversation(personaId);
      });
    }
    
    console.log(`🔄 Cinépolis AI orchestrator reset with conversation generator`);
  }
}