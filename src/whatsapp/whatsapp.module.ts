import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [OllamaModule],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
