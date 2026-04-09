import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ollama')
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  /**
   * POST /ollama/chat
   * Body: { "message": "Hola", "model": "gemma3:4b" }
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto): Promise<{ reply: string }> {
    const reply = await this.ollamaService.chat(dto.message, dto.model);
    return { reply };
  }

  /**
   * GET /ollama/models
   * Retorna los modelos disponibles en Ollama
   */
  @Get('models')
  async models(): Promise<{ models: string[] }> {
    const models = await this.ollamaService.listModels();
    return { models };
  }
}
