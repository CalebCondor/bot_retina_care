import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { OllamaService } from '../ollama/ollama.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private client!: Client;

  constructor(private readonly ollamaService: OllamaService) {}

  onModuleInit() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'bot-retina-care' }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr: string) => {
      this.logger.log('QR Code recibido — escanéalo con WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.logger.log('Cliente de WhatsApp listo y conectado ✓');
    });

    this.client.on('auth_failure', (msg: string) => {
      this.logger.error(`Error de autenticación: ${msg}`);
    });

    this.client.on('disconnected', (reason: string) => {
      this.logger.warn(`Cliente desconectado: ${reason}`);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.client.on('message', async (message: Message) => {
      // Ignorar mensajes propios, de grupos, broadcasts y estados
      if (message.from === 'status@broadcast') return;
      if (message.broadcast) return;

      const chat = await message.getChat();
      if (chat.isGroup) return;

      const incoming = message.body.trim();
      if (!incoming) return;

      this.logger.log(`Mensaje recibido de ${message.from}: "${incoming}"`);

      try {
        // Pasar el message.from para identificar el hilo de conversación
        const reply = await this.ollamaService.chat(incoming, message.from);
        if (!reply || !reply.trim()) {
          this.logger.warn(
            `Respuesta vacía de Ollama para ${message.from}, reintentando...`,
          );
          const retryReply = await this.ollamaService.chat(
            incoming,
            message.from,
          );
          if (!retryReply || !retryReply.trim()) {
            await message.reply(
              'Disculpe, no pude procesar su mensaje en este momento. Por favor intente de nuevo.',
            );
            return;
          }
          await message.reply(retryReply);
          this.logger.log(`Respuesta enviada a ${message.from} (reintento)`);
          return;
        }
        await message.reply(reply);
        this.logger.log(`Respuesta enviada a ${message.from}`);
      } catch (error) {
        this.logger.error(
          `Error al procesar mensaje: ${(error as Error).message}`,
        );
        await message.reply(
          'Lo siento, ocurrió un error al procesar tu mensaje.',
        );
      }
    });

    void this.client.initialize();
    this.logger.log('Inicializando cliente de WhatsApp...');
  }

  /** Envía un mensaje proactivo a un número específico */
  async sendMessage(to: string, text: string): Promise<void> {
    // El número debe tener el formato: 521XXXXXXXXXX@c.us
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    await this.client.sendMessage(chatId, text);
  }
}
