import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../ollama/ollama.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly instanceId =
    process.env.ULTRAMSG_INSTANCE_ID ?? 'instance170610';
  private readonly token = process.env.ULTRAMSG_TOKEN ?? '';
  private readonly apiBase = `https://api.ultramsg.com/${this.instanceId}`;

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /** Procesa un mensaje entrante desde el webhook de UltraMsg */
  async handleIncoming(from: string, body: string): Promise<void> {
    const incoming = body.trim();
    if (!incoming) return;

    this.logger.log(`Mensaje recibido de ${from}: "${incoming}"`);

    void this.notificacionesService.enviarAlerta({
      tipo: 'mensaje_entrante',
      numero: from,
      mensaje: incoming,
      timestamp: new Date().toISOString(),
    });

    try {
      const reply = await this.ollamaService.chat(incoming, from);

      if (!reply || !reply.trim()) {
        this.logger.warn(
          `Respuesta vacía de OpenAI para ${from}, reintentando...`,
        );
        const retryReply = await this.ollamaService.chat(incoming, from);
        if (!retryReply || !retryReply.trim()) {
          await this.sendMessage(
            from,
            'Disculpe, no pude procesar su mensaje en este momento. Por favor intente de nuevo.',
          );
          return;
        }
        await this.sendMessage(from, retryReply);
        void this.notificacionesService.enviarAlerta({
          tipo: 'respuesta_enviada',
          numero: from,
          respuesta: retryReply,
          timestamp: new Date().toISOString(),
        });
        this.logger.log(`Respuesta enviada a ${from} (reintento)`);
        return;
      }

      await this.sendMessage(from, reply);
      void this.notificacionesService.enviarAlerta({
        tipo: 'respuesta_enviada',
        numero: from,
        respuesta: reply,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`Respuesta enviada a ${from}`);
    } catch (error) {
      this.logger.error(
        `Error al procesar mensaje: ${(error as Error).message}`,
      );
      await this.sendMessage(
        from,
        'Lo siento, ocurrió un error al procesar tu mensaje.',
      );
    }
  }

  /** Envía un mensaje a través de la API de UltraMsg */
  async sendMessage(to: string, text: string): Promise<void> {
    const url = `${this.apiBase}/messages/chat`;
    const body = new URLSearchParams({
      token: this.token,
      to,
      body: text,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`UltraMsg API error ${response.status}: ${errorText}`);
    }

    this.logger.log(`Mensaje enviado a ${to} vía UltraMsg`);
  }
}
