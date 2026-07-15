import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export enum WhatsappStatus {
  INITIALIZING = 'INITIALIZING',
  DISCONNECTED = 'DISCONNECTED',
  QR_READY = 'QR_READY',
  CONNECTED = 'CONNECTED',
  AUTHENTICATING = 'AUTHENTICATING',
  AUTH_FAILURE = 'AUTH_FAILURE',
}

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private client: Client;
  private status: WhatsappStatus = WhatsappStatus.DISCONNECTED;
  private currentQrCode: string | null = null;
  
  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    this.initializeClient();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.destroy();
    }
  }

  private initializeClient() {
    this.status = WhatsappStatus.INITIALIZING;
    this.currentQrCode = null;

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'gym-manager-wp' }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      }
    });

    this.client.on('qr', (qr) => {
      this.logger.log('WhatsApp QR Code received');
      this.currentQrCode = qr;
      this.status = WhatsappStatus.QR_READY;
      // Emitir evento para WebSockets si los tuviéramos
      this.eventEmitter.emit('whatsapp.qr', { qr });
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp Client is READY!');
      this.status = WhatsappStatus.CONNECTED;
      this.currentQrCode = null;
      this.eventEmitter.emit('whatsapp.ready');
    });

    this.client.on('authenticated', () => {
      this.logger.log('WhatsApp Authenticated');
      this.status = WhatsappStatus.AUTHENTICATING;
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error('WhatsApp Authentication failure', msg);
      this.status = WhatsappStatus.AUTH_FAILURE;
      this.currentQrCode = null;
      this.eventEmitter.emit('whatsapp.auth_failure', { message: msg });
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp Client disconnected', reason);
      this.status = WhatsappStatus.DISCONNECTED;
      this.currentQrCode = null;
      this.eventEmitter.emit('whatsapp.disconnected', { reason });
      
      // Intentar reconectar si fue desconectado de forma inesperada
      if (reason !== 'LOGOUT') {
        setTimeout(() => {
          this.logger.log('Reinitializing WhatsApp client...');
          this.initializeClient();
        }, 5000);
      }
    });

    this.logger.log('Initializing WhatsApp client...');
    this.client.initialize().catch(err => {
      this.logger.error('Failed to initialize WhatsApp client', err);
      this.status = WhatsappStatus.DISCONNECTED;
    });
  }

  public getStatus() {
    return {
      status: this.status,
      qr: this.currentQrCode,
    };
  }

  public async logout() {
    this.logger.log('Logging out from WhatsApp...');
    if (this.client) {
      try {
        await this.client.logout();
      } catch (err) {
        this.logger.error('Logout failed, destroying client', err);
        await this.client.destroy();
      }
    }
    this.status = WhatsappStatus.DISCONNECTED;
    this.currentQrCode = null;
    
    // Reiniciar para generar un nuevo QR
    setTimeout(() => {
      this.initializeClient();
    }, 3000);
    
    return { success: true };
  }
  
  public async restartClient() {
    this.logger.log('Restarting WhatsApp Client...');
    if (this.client) {
      await this.client.destroy();
    }
    this.initializeClient();
    return { success: true };
  }

  private async getValidChatId(phoneNumber: string): Promise<{ chatId: string, cleanNumber: string }> {
    let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    // Si el número es local de RD (10 dígitos) y empieza con 809, 829 o 849, le agregamos el '1'
    if (cleanNumber.length === 10 && ['809', '829', '849'].some(prefix => cleanNumber.startsWith(prefix))) {
      cleanNumber = '1' + cleanNumber;
    }

    try {
      const numberId = await this.client.getNumberId(cleanNumber);
      if (numberId) {
        return { chatId: numberId._serialized, cleanNumber };
      } else {
        throw new Error(`El número ${cleanNumber} no está registrado en WhatsApp.`);
      }
    } catch (e) {
      this.logger.warn(`Error al verificar número ${cleanNumber}: ${e.message}`);
      throw e;
    }
  }

  public async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (this.status !== WhatsappStatus.CONNECTED) {
      this.logger.error(`Cannot send WhatsApp message: Client status is ${this.status}`);
      throw new Error('WhatsApp client is not connected');
    }

    try {
      const { chatId, cleanNumber } = await this.getValidChatId(phoneNumber);
      
      const response = await this.client.sendMessage(chatId, message);
      this.logger.log(`WhatsApp message sent to ${cleanNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${phoneNumber}`, error);
      throw error;
    }
  }

  public async sendHtmlAsPdf(phoneNumber: string, htmlContent: string, fallbackText: string): Promise<boolean> {
    if (this.status !== WhatsappStatus.CONNECTED) {
      this.logger.error(`Cannot send WhatsApp PDF: Client status is ${this.status}`);
      throw new Error('WhatsApp client is not connected');
    }

    let tempPdfPath: string | null = null;
    try {
      const { chatId, cleanNumber } = await this.getValidChatId(phoneNumber);

      // 1. Send the text message first
      await this.client.sendMessage(chatId, fallbackText);

      // 2. Generate PDF using Puppeteer
      this.logger.log('Generating PDF from HTML content...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load' });
      
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      tempPdfPath = path.join(tempDir, `aviso_${uuidv4()}.pdf`);
      await page.pdf({ path: tempPdfPath, format: 'A4', printBackground: true });
      await browser.close();

      // 3. Send the PDF as media
      this.logger.log(`Sending PDF to ${cleanNumber}`);
      const media = MessageMedia.fromFilePath(tempPdfPath);
      await this.client.sendMessage(chatId, media, { caption: 'Documento adjunto' });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp PDF to ${phoneNumber}`, error);
      throw error;
    } finally {
      // Clean up the temp file
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    }
  }
}
