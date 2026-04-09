import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OllamaModule } from './ollama/ollama.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [OllamaModule, WhatsappModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
