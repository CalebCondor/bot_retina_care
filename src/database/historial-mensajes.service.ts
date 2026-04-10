import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialMensaje } from './entities/historial-mensajes.entity';

@Injectable()
export class HistorialMensajesService {
  constructor(
    @InjectRepository(HistorialMensaje)
    private readonly repo: Repository<HistorialMensaje>,
  ) {}

  async getHistory(chatId: string, limit = 20): Promise<HistorialMensaje[]> {
    return this.repo.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async addMessage(
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ): Promise<void> {
    const msg = this.repo.create({ chatId, role, content });
    await this.repo.save(msg);
  }
}
