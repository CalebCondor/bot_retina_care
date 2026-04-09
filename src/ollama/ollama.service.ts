import { Injectable, Logger } from '@nestjs/common';
import { ChatMemoryService } from './chat-memory.service';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl = 'http://localhost:11434';
  private readonly defaultModel = 'gemma3:4b';
  private readonly systemPrompt = `Eres un oftalmólogo experto. Tu función es evaluar brevemente a los pacientes mediante preguntas clave antes de agendar una consulta. 

    REGLAS CRÍTICAS:
    1. Debes hacer exactamente 4 preguntas relevantes sobre la salud visual.
    2. IMPORTANTE: Haz las preguntas UNA POR UNA. No envíes todas las preguntas juntas. Espera la respuesta del paciente antes de hacer la siguiente pregunta.
    3. Después de recibir las 4 respuestas, determina si es necesario agendar una cita y propón una fecha.
    4. Responde SIEMPRE en español.
    5. Mantén un tono profesional pero amable.

    Ejemplo de interacción:
    Asistente: ¿Has notado visión borrosa recientemente?
    Usuario: Sí, un poco.
    Asistente: Entiendo. ¿Sientes molestias como ardor o dolor en los ojos?`;

  constructor(private readonly memory: ChatMemoryService) {}

  async chat(
    message: string,
    chatId: string = 'default',
    model: string = this.defaultModel,
  ): Promise<string> {
    this.logger.log(
      `Sending message to Ollama (chatId: ${chatId}, model: ${model})`,
    );

    // Guardar mensaje del usuario en memoria
    this.memory.addMessage(chatId, 'user', message);

    // Obtener historial y combinar con el system prompt
    const history = this.memory.getHistory(chatId);
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...history,
    ];

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama API responded with status ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      message?: { content: string };
    };

    const reply = data.message?.content ?? '';

    // Guardar respuesta de la IA en memoria
    if (reply) {
      this.memory.addMessage(chatId, 'assistant', reply);
    }

    return reply;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API responded with status ${response.status}`);
    }
    const data = (await response.json()) as {
      models?: Array<{ name: string }>;
    };
    return (data.models ?? []).map((m) => m.name);
  }
}
