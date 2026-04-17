import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MemoriaLargoPlazoService } from '../database/memoria-largo-plazo.service';

export interface AlertaPayload {
  tipo: 'mensaje_entrante' | 'datos_paciente_registrados' | 'respuesta_enviada';
  numero: string;
  mensaje?: string;
  respuesta?: string;
  datos?: Record<string, string>;
  timestamp: string;
}

export type PacientesMap = Record<string, Record<string, string>>;

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly alertas$ = new Subject<AlertaPayload>();
  private readonly historial: AlertaPayload[] = [];

  constructor(private readonly memoriaService: MemoriaLargoPlazoService) {}

  /** Stream listo para usar directamente en un endpoint SSE */
  get stream(): Observable<MessageEvent> {
    return this.alertas$.pipe(
      map(
        (payload): MessageEvent => ({
          data: payload,
          type: payload.tipo,
        }),
      ),
    );
  }

  /** Devuelve las alertas en memoria (desde que el servidor arrancó) */
  getHistorial(numero?: string): AlertaPayload[] {
    if (numero) {
      return this.historial.filter((a) => a.numero === numero);
    }
    return this.historial;
  }

  /** Devuelve todos los pacientes con sus datos desde la base de datos */
  async getPacientes(
    numero?: string,
  ): Promise<PacientesMap | Record<string, string>> {
    const todos = await this.memoriaService.getAllPacientes();
    if (numero) {
      return todos[numero] ?? {};
    }
    return todos;
  }

  enviarAlerta(payload: AlertaPayload): void {
    this.logger.debug(`Alerta "${payload.tipo}" para ${payload.numero}`);
    this.historial.push(payload);
    this.alertas$.next(payload);
  }
}
