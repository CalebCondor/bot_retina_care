import { Body, Controller, Logger, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

interface UltraMsgWebhookPayload {
  data?: {
    from?: string;
    body?: string;
    type?: string;
    id?: string;
  };
  event_type?: string;
}

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('webhook')
  async handleWebhook(@Body() payload: UltraMsgWebhookPayload): Promise<void> {
    const eventType = payload?.event_type;
    const data = payload?.data;

    // Solo procesar mensajes de texto entrantes
    if (eventType !== 'message_received' || data?.type !== 'chat') return;

    const from = data?.from;
    const body = data?.body;

    if (!from || !body) return;

    this.logger.log(`Webhook recibido de ${from}`);
    await this.whatsappService.handleIncoming(from, body);
  }
}
