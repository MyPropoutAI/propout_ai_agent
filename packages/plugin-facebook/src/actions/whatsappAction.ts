// whatsapp-bot.plugin.ts
import { 
    Action, 
    Plugin, 
    ElizerEventBus, 
    ElizerConfig, 
    Inject, 
    ElizerDataService 
  } from "@"
  import { Client, LocalAuth, Message, Chat, GroupChat } from 'whatsapp-web.js';
  import qrcode from 'qrcode-terminal';
  import { AIService } from './ai-service';
  import { PropertyListing, PropertyRequest } from '../models';
  import { configSchema } from './whatsapp-bot.schema';
  import { 
    WhatsAppMessagePayload,
    PropertyAnalysisResult,
    GroupMetadata
  } from './whatsapp-bot.interface';
  
  @Plugin({
    name: 'WhatsAppBot',
    version: '1.2.0',
    dependencies: [
      'AIService',
      'ElizerEventBus',
      'ElizerDataService',
      'ElizerConfig'
    ],
    configSchema,
    actions: [
      {
        name: 'send-whatsapp-message',
        description: 'Send message through WhatsApp',
        params: {
          to: 'string',
          message: 'string'
        }
      },
      {
        name: 'initiate-scan',
        description: 'Start chat scanning process'
      }
    ]
  })
  export class WhatsAppBotPlugin extends Action {
    private client: Client;
    private scanInterval?: NodeJS.Timeout;
    private isScanning = false;
    private ready = false;
    private currentScanProgress = 0;
  
    constructor(
      @Inject('AIService') private aiService: AIService,
      @Inject('ElizerEventBus') private eventBus: ElizerEventBus,
      @Inject('ElizerConfig') private config: ElizerConfig,
      @Inject('ElizerDataService') private dataService: ElizerDataService
    ) {
      super('WhatsAppBot');
      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: this.config.get('puppeteer') || {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      });
    }
  
    @Action.Lifecycle('preActivate')
    async preActivate() {
      this.eventBus.emit('whatsapp.status', { status: 'initializing' });
      this.setupClientEvents();
      await this.initializeClientWithRetry();
      this.startPeriodicScan();
    }
  
    @Action.Lifecycle('postDeactivate')
    async postDeactivate() {
      await this.client.destroy();
      if (this.scanInterval) clearInterval(this.scanInterval);
      this.eventBus.emit('whatsapp.status', { status: 'inactive' });
    }
  
    private setupClientEvents() {
      this.client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        this.eventBus.emit('whatsapp.qr', { qr });
      });
  
      this.client.on('ready', () => {
        this.ready = true;
        this.eventBus.emit('whatsapp.ready', { 
          timestamp: Date.now(),
          user: this.client.info.pushname
        });
      });
  
      this.client.on('authenticated', () => {
        this.eventBus.emit('whatsapp.authenticated');
      });
  
      this.client.on('auth_failure', (msg) => {
        this.eventBus.emit('whatsapp.error', {
          code: 'AUTH_FAILURE',
          message: msg
        });
      });
  
      this.client.on('disconnected', (reason) => {
        this.ready = false;
        this.eventBus.emit('whatsapp.disconnected', { reason });
      });
  
      this.client.on('message', async (msg) => {
        const transformed = await this.transformMessage(msg);
        this.eventBus.emit('whatsapp.message.received', transformed);
        await this.handleMessage(msg);
      });
    }
  
    private async initializeClientWithRetry(retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          await this.client.initialize();
          return;
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  
    @Action.Handle('send-whatsapp-message')
    async sendMessage(payload: WhatsAppMessagePayload) {
      if (!this.ready) throw new Error('Client not ready');
      
      const chat = await this.client.getChatById(payload.to);
      const message = await chat.sendMessage(payload.message);
      
      return {
        success: true,
        messageId: message.id.id,
        timestamp: message.timestamp
      };
    }
  
    @Action.Handle('initiate-scan')
    async startScan() {
      if (!this.ready) throw new Error('Client not ready');
      return this.scanAllChats();
    }
  
    private async handleMessage(message: Message) {
      try {
        const content = message.body.toLowerCase();
        const contact = await message.getContact();
        const chat = await message.getChat();
  
        if (this.isPropertyContent(content)) {
          const analysis = await this.analyzeMessageContent(message);
          
          if (analysis.type === 'listing') {
            await this.processPropertyListing(message, contact, analysis);
          } else {
            await this.processPropertyRequest(message, contact, analysis);
          }
  
          this.notifyAllowedContacts({
            type: analysis.type,
            message: message.body,
            contact: contact.id.user
          });
        }
      } catch (error) {
        this.eventBus.emit('whatsapp.error', {
          code: 'MESSAGE_PROCESSING',
          error,
          messageId: message.id.id
        });
      }
    }
  
    private async analyzeMessageContent(message: Message): Promise<PropertyAnalysisResult> {
      const content = message.body;
      const hasMedia = message.hasMedia;
      
      const analysis = await this.aiService.analyzeProperty(content);
      
      return {
        type: analysis.isListing ? 'listing' : 'request',
        price: analysis.price,
        location: analysis.location,
        propertyType: analysis.propertyType,
        confidence: analysis.confidenceScore,
        hasMedia
      };
    }
  
    private async processPropertyListing(
      message: Message,
      contact: any,
      analysis: PropertyAnalysisResult
    ) {
      const listingData = {
        source: 'whatsapp',
        content: this.truncateContent(message.body),
        price: analysis.price,
        location: analysis.location,
        propertyType: analysis.propertyType,
        contactInfo: {
          name: contact.pushname || contact.id.user,
          number: contact.id.user
        },
        metadata: {
          messageId: message.id.id,
          confidence: analysis.confidence,
          mediaAttached: analysis.hasMedia
        }
      };
  
      await this.dataService.create('PropertyListings', listingData);
      this.eventBus.emit('whatsapp.listing.processed', listingData);
    }
  
    private async processPropertyRequest(
      message: Message,
      contact: any,
      analysis: PropertyAnalysisResult
    ) {
      const requestData = {
        source: 'whatsapp',
        requirements: {
          propertyType: analysis.propertyType,
          location: analysis.location,
          budget: analysis.price
        },
        contactInfo: {
          name: contact.pushname || contact.id.user,
          number: contact.id.user
        },
        metadata: {
          messageId: message.id.id,
          confidence: analysis.confidence
        }
      };
  
      await this.dataService.create('PropertyRequests', requestData);
      this.eventBus.emit('whatsapp.request.processed', requestData);
    }
  
    private async scanAllChats() {
      if (this.isScanning) return;
      this.isScanning = true;
      
      try {
        const chats = await this.client.getChats();
        this.currentScanProgress = 0;
        
        for (const chat of chats) {
          await this.processChat(chat);
          this.currentScanProgress++;
          this.eventBus.emit('whatsapp.scan.progress', {
            total: chats.length,
            current: this.currentScanProgress
          });
        }
        
        this.eventBus.emit('whatsapp.scan.complete', {
          scannedChats: chats.length,
          foundListings: await this.dataService.count('PropertyListings'),
          foundRequests: await this.dataService.count('PropertyRequests')
        });
      } finally {
        this.isScanning = false;
      }
    }
  
    private async processChat(chat: Chat) {
      const messages = await chat.fetchMessages({ limit: 100 });
      
      for (const message of messages) {
        if (this.isPropertyContent(message.body)) {
          await this.handleMessage(message);
        }
      }
  
      if (chat.isGroup) {
        await this.processGroupMetadata(chat as GroupChat);
      }
    }
  
    private async processGroupMetadata(group: GroupChat) {
      const metadata: GroupMetadata = {
        id: group.id._serialized,
        name: group.name,
        description: group.description || '',
        participants: group.participants.map(p => ({
          id: p.id._serialized,
          isAdmin: p.isAdmin
        })),
        isRealEstate: this.isRealEstateGroup(group.name, group.description || '')
      };
  
      await this.dataService.upsert('WhatsAppGroups', metadata);
      this.eventBus.emit('whatsapp.group.updated', metadata);
    }
  
    private isRealEstateGroup(name: string, description: string): boolean {
      const keywords = ['property', 'real estate', 'rent', 'sale'];
      return keywords.some(k => `${name} ${description}`.toLowerCase().includes(k));
    }
  
    private truncateContent(content: string): string {
      const maxLength = this.config.get('maxMessageLength') || 16000;
      return content.length > maxLength 
        ? `${content.substring(0, maxLength)}...` 
        : content;
    }
  
    private startPeriodicScan() {
      const interval = this.config.get('scanInterval') || 30;
      this.scanInterval = setInterval(() => {
        if (this.ready && !this.isScanning) {
          this.scanAllChats();
        }
      }, interval * 60 * 1000);
    }
  
    private notifyAllowedContacts(payload: {
      type: 'listing' | 'request';
      message: string;
      contact: string;
    }) {
      const allowedNumbers = this.config.get('allowedNumbers') || [];
      const allowedGroups = this.config.get('allowedGroups') || [];
      
      this.eventBus.emit('whatsapp.notification', {
        ...payload,
        targets: [...allowedNumbers, ...allowedGroups]
      });
    }
  
    private async transformMessage(message: Message): Promise<WhatsAppMessagePayload> {
      const contact = await message.getContact();
      return {
        id: message.id.id,
        content: message.body,
        timestamp: message.timestamp,
        from: contact.id.user,
        isGroup: message.fromMe,
        hasMedia: message.hasMedia,
        location: this.extractLocation(message.body)
      };
    }
  
    private extractLocation(content: string): string {
      // AI-powered location extraction can be added here
      const regex = /(in|at|near)\s+([\w\s]+)/i;
      const match = content.match(regex);
      return match ? match[2].trim() : 'Unknown';
    }
  
    @Action.ErrorHandler
    handleError(error: Error) {
      this.eventBus.emit('whatsapp.error', {
        code: 'UNHANDLED_ERROR',
        message: error.message,
        stack: error.stack
      });
      
      // Attempt client restart on critical errors
      if (this.isCriticalError(error)) {
        this.client.initialize().catch(() => {
          this.eventBus.emit('whatsapp.fatal', { 
            error: 'Client restart failed' 
          });
        });
      }
    }
  
    private isCriticalError(error: Error): boolean {
      return [
        'ECONNRESET',
        'UNAUTHENTICATED',
        'SESSION_TIMEOUT'
      ].some(code => error.message.includes(code));
    }
  }
  
  // whatsapp-bot.schema.ts
  export const configSchema = {
    type: 'object',
    properties: {
      allowedNumbers: {
        type: 'array',
        items: { type: 'string' },
        default: []
      },
      allowedGroups: {
        type: 'array',
        items: { type: 'string' },
        default: []
      },
      scanInterval: {
        type: 'number',
        minimum: 5,
        maximum: 1440,
        default: 30
      },
      maxMessageLength: {
        type: 'number',
        default: 16000
      },
      puppeteer: {
        type: 'object',
        properties: {
          headless: { type: 'boolean', default: true },
          args: {
            type: 'array',
            items: { type: 'string' },
            default: ['--no-sandbox', '--disable-setuid-sandbox']
          }
        }
      }
    },
    required: ['allowedNumbers']
  };
  
  // whatsapp-bot.interface.ts
  export interface WhatsAppMessagePayload {
    id: string;
    content: string;
    timestamp: number;
    from: string;
    isGroup: boolean;
    hasMedia: boolean;
    location: string;
  }
  
  export interface PropertyAnalysisResult {
    type: 'listing' | 'request';
    price: number;
    location: string;
    propertyType: string;
    confidence: number;
    hasMedia: boolean;
  }
  
  export interface GroupMetadata {
    id: string;
    name: string;
    description: string;
    participants: Array<{
      id: string;
      isAdmin: boolean;
    }>;
    isRealEstate: boolean;
  }
  
  // index.ts (Plugin Registration)
  import { ElizerPlugin } from '@elizer/os-core';
  
  export default ElizerPlugin(WhatsAppBotPlugin);