import { Module } from '@nestjs/common';
import { OllamaController } from './ollama.controller';
import { OllamaService } from './ollama.service';
import { ChatMemoryService } from './chat-memory.service';
import { DatabaseModule } from '../database/database.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [DatabaseModule, NotificacionesModule],
  controllers: [OllamaController],
  providers: [OllamaService, ChatMemoryService],
  exports: [OllamaService, ChatMemoryService],
})
export class OllamaModule {}
