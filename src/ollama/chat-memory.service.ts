import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatMemoryService {
  // Mapa de chatId (teléfono) -> Array de mensajes
  private sessions = new Map<
    string,
    { role: 'user' | 'assistant' | 'system'; content: string }[]
  >();

  getHistory(chatId: string) {
    return this.sessions.get(chatId) || [];
  }

  addMessage(
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ) {
    const history = this.getHistory(chatId);
    history.push({ role, content });

    // Mantener solo los últimos 15 mensajes para no saturar el contexto (memoria a corto plazo)
    if (history.length > 15) {
      history.shift();
    }

    this.sessions.set(chatId, history);
  }

  clear(chatId: string) {
    this.sessions.delete(chatId);
  }
}
