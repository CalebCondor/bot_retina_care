import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialMensaje } from './entities/historial-mensajes.entity';
import { MemoriaLargoPlazo } from './entities/memoria-largo-plazo.entity';
import { ConocimientoEspecifico } from './entities/conocimiento-especifico.entity';
import { HistorialMensajesService } from './historial-mensajes.service';
import { MemoriaLargoPlazoService } from './memoria-largo-plazo.service';
import { ConocimientoEspecificoService } from './conocimiento-especifico.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HistorialMensaje,
      MemoriaLargoPlazo,
      ConocimientoEspecifico,
    ]),
  ],
  providers: [
    HistorialMensajesService,
    MemoriaLargoPlazoService,
    ConocimientoEspecificoService,
  ],
  exports: [
    HistorialMensajesService,
    MemoriaLargoPlazoService,
    ConocimientoEspecificoService,
  ],
})
export class DatabaseModule {}
