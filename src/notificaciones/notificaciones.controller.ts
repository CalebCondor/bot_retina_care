import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { NotificacionesService, AlertaPayload } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  /**
   * GET /notificaciones/stream
   * Endpoint SSE en tiempo real.
   */
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.notificacionesService.stream;
  }

  /**
   * GET /notificaciones/alertas
   * Alertas en memoria desde que el servidor arrancó.
   * Query param opcional: ?numero=521XXXXXXXXXX@c.us
   */
  @Get('alertas')
  alertas(@Query('numero') numero?: string): AlertaPayload[] {
    return this.notificacionesService.getHistorial(numero);
  }

  /**
   * GET /notificaciones/pacientes
   * Todos los pacientes con sus datos desde la base de datos.
   * Query param opcional: ?numero=521XXXXXXXXXX@c.us
   */
  @Get('pacientes')
  async pacientes(@Query('numero') numero?: string): Promise<object> {
    return this.notificacionesService.getPacientes(numero);
  }
}
