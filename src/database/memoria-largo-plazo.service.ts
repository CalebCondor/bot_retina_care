import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoriaLargoPlazo } from './entities/memoria-largo-plazo.entity';

@Injectable()
export class MemoriaLargoPlazoService {
  constructor(
    @InjectRepository(MemoriaLargoPlazo)
    private readonly repo: Repository<MemoriaLargoPlazo>,
  ) {}

  async getMemoria(chatId: string): Promise<MemoriaLargoPlazo[]> {
    return this.repo.find({ where: { chatId } });
  }

  async upsert(chatId: string, clave: string, valor: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { chatId, clave } });
    if (existing) {
      existing.valor = valor;
      await this.repo.save(existing);
    } else {
      await this.repo.save(this.repo.create({ chatId, clave, valor }));
    }
  }

  async getAllPacientes(): Promise<Record<string, Record<string, string>>> {
    const rows = await this.repo.find({ order: { chatId: 'ASC' } });
    const result: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      if (!result[row.chatId]) result[row.chatId] = {};
      result[row.chatId][row.clave] = row.valor;
    }
    return result;
  }
}
