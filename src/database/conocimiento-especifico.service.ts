import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConocimientoEspecifico } from './entities/conocimiento-especifico.entity';

@Injectable()
export class ConocimientoEspecificoService {
  constructor(
    @InjectRepository(ConocimientoEspecifico)
    private readonly repo: Repository<ConocimientoEspecifico>,
  ) {}

  async getActivos(): Promise<ConocimientoEspecifico[]> {
    return this.repo.find({ where: { activo: true } });
  }

  async create(
    titulo: string,
    contenido: string,
    activo = true,
  ): Promise<ConocimientoEspecifico> {
    const record = this.repo.create({ titulo, contenido, activo });
    return this.repo.save(record);
  }
}
