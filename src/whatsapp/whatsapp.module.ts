import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { OllamaModule } from '../ollama/ollama.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [OllamaModule, NotificacionesModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
