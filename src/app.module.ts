import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OllamaModule } from './ollama/ollama.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DatabaseModule } from './database/database.module';
import { HistorialMensaje } from './database/entities/historial-mensajes.entity';
import { MemoriaLargoPlazo } from './database/entities/memoria-largo-plazo.entity';
import { ConocimientoEspecifico } from './database/entities/conocimiento-especifico.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [HistorialMensaje, MemoriaLargoPlazo, ConocimientoEspecifico],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    OllamaModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
