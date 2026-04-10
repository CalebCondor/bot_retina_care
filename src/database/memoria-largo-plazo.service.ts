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
}
