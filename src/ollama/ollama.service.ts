import { Injectable, Logger } from '@nestjs/common';
import { HistorialMensajesService } from '../database/historial-mensajes.service';
import { MemoriaLargoPlazoService } from '../database/memoria-largo-plazo.service';
import { ConocimientoEspecificoService } from '../database/conocimiento-especifico.service';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl = 'http://localhost:11434';
  private readonly defaultModel = 'gemma3:4b';
  private readonly systemPrompt = `Eres el asistente virtual de Retina Care, una clínica oftalmológica especializada en retina ubicada en Puerto Rico. Tu función es atender a los pacientes siguiendo un flujo de conversación estructurado.

    CONTEXTO DE PUERTO RICO:
    - La clínica opera bajo el sistema de salud de Puerto Rico, incluyendo planes como Triple-S, MCS, MMM, Humana, Medicare Advantage y Medicaid (Vital).
    - Responde en español puertorriqueño por defecto. Si el paciente escribe en inglés, responde en inglés.
    - Horario de atención: Lunes a Viernes de 7:30am a 2:30pm (AST).
    - Si el paciente menciona síntomas de emergencia (pérdida súbita de visión, destellos intensos, cortina oscura en la visión), indícale que debe ir a urgencias o llamar al 9-1-1 de inmediato.

    FLUJO DE CONVERSACIÓN OBLIGATORIO (sigue este orden estrictamente):

    PASO 1 — SALUDO INICIAL:
    Al iniciar siempre envía este mensaje de bienvenida:
    "Saludos, gracias por comunicarse con Retina Care. Nuestro horario de atención y citas es de Lunes a Viernes de 7:30am a 2:30pm.
    ¿Es usted paciente nuevo o existente? Por favor seleccione una opción:
    1️Nuevo paciente
    2️Paciente existente
    3️Tengo una pregunta
    4️Otro"

    PASO 2 — SEGÚN LA OPCIÓN ELEGIDA:

    OPCIÓN 1 - NUEVO PACIENTE:
    Responde: "Para coordinar una cita como paciente nuevo, por favor déjenos su nombre completo, pueblo de residencia y número de teléfono. Nuestro personal se estará comunicando con usted lo más pronto posible."
    - Espera a que el paciente provea los datos.
    - Una vez recibidos, confirma: "Gracias, [nombre]. Hemos recibido su información. Un miembro de nuestro equipo se comunicará con usted pronto. ¡Que tenga un excelente día!"

    OPCIÓN 2 - PACIENTE EXISTENTE:
    Responde: "Para coordinar, confirmar o cancelar una cita, por favor déjenos su nombre completo y número de teléfono. Nuestro personal se estará comunicando con usted tan pronto como sea posible."
    - Espera a que el paciente provea los datos.
    - Una vez recibidos, confirma: "Gracias, [nombre]. Hemos recibido su información. Un miembro de nuestro equipo se comunicará con usted pronto. ¡Que tenga un excelente día!"

    OPCIÓN 3 - TENGO UNA PREGUNTA:
    Responde: "Con gusto le ayudamos. Por favor escriba su pregunta y añada su nombre y número de teléfono para poder comunicarnos con usted lo antes posible."
    - Espera la respuesta del paciente.
    - Una vez recibida, confirma: "Gracias por su mensaje. Nuestro personal revisará su pregunta y se comunicará con usted pronto."

    OPCIÓN 4 - OTRO:
    Responde: "Por favor descríbanos el motivo de su comunicación y añada su nombre y número de teléfono. Nos comunicaremos con usted a la brevedad posible."
    - Espera la respuesta del paciente.
    - Una vez recibida, confirma: "Gracias por su mensaje. Nuestro equipo se comunicará con usted pronto."

    REGLAS GENERALES:
    1. Sigue el flujo UNA ETAPA A LA VEZ. No saltes pasos.
    2. Nunca inventes citas, fechas ni disponibilidades. El personal humano es quien confirma citas.
    3. Mantén un tono profesional, cálido y cercano, acorde al trato humano típico de Puerto Rico.
    4. Si el paciente no selecciona una opción válida, repite el menú amablemente.`;

  constructor(
    private readonly historialService: HistorialMensajesService,
    private readonly memoriaService: MemoriaLargoPlazoService,
    private readonly conocimientoService: ConocimientoEspecificoService,
  ) {}

  async chat(
    message: string,
    chatId: string = 'default',
    model: string = this.defaultModel,
  ): Promise<string> {
    this.logger.log(
      `Sending message to Ollama (chatId: ${chatId}, model: ${model})`,
    );

    // Guardar mensaje del usuario en historial persistente
    await this.historialService.addMessage(chatId, 'user', message);

    // Cargar historial de BD (últimos 20 mensajes)
    const history = await this.historialService.getHistory(chatId, 20);

    // Cargar memoria a largo plazo del usuario
    const memoria = await this.memoriaService.getMemoria(chatId);

    // Cargar conocimiento específico activo
    const conocimiento = await this.conocimientoService.getActivos();

    // Construir system prompt dinámico con memoria y conocimiento
    let systemContent = this.systemPrompt;

    if (memoria.length > 0) {
      const memoriaStr = memoria
        .map((m) => `- ${m.clave}: ${m.valor}`)
        .join('\n');
      systemContent += `\n\n    INFORMACIÓN CONOCIDA DEL PACIENTE:\n${memoriaStr}`;
    }

    if (conocimiento.length > 0) {
      const conocimientoStr = conocimiento
        .map((k) => `[${k.titulo}]: ${k.contenido}`)
        .join('\n');
      systemContent += `\n\n    CONOCIMIENTO ESPECÍFICO ADICIONAL:\n${conocimientoStr}`;
    }

    const messages = [
      { role: 'system', content: systemContent },
      ...history.map((h) => ({ role: h.role, content: h.content })),
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

    // Guardar respuesta del asistente en historial persistente
    if (reply) {
      await this.historialService.addMessage(chatId, 'assistant', reply);

      // Extraer y guardar información del usuario de forma asíncrona
      this.extractAndSaveUserFacts(chatId, message).catch((e: Error) =>
        this.logger.warn(`Error extrayendo datos del usuario: ${e.message}`),
      );
    }

    return reply;
  }

  /**
   * Usa el LLM para detectar datos básicos del usuario en su mensaje
   * (nombre, pueblo, teléfono, plan médico) y los persiste en memoria_largo_plazo.
   */
  private async extractAndSaveUserFacts(
    chatId: string,
    userMessage: string,
  ): Promise<void> {
    const extractPrompt = `Analiza el siguiente mensaje de un paciente y extrae ÚNICAMENTE los datos básicos si están presentes de forma explícita.
Responde SOLO en formato JSON con los campos que encuentres: {"nombre": "...", "pueblo": "...", "telefono": "...", "plan_medico": "..."}
Si un campo no está presente, omítelo. Si no hay ningún dato, responde exactamente: {}

Mensaje del paciente: "${userMessage}"`;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [{ role: 'user', content: extractPrompt }],
        stream: false,
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as {
      message?: { content: string };
    };
    const content = data.message?.content ?? '{}';

    // Extraer el primer bloque JSON de la respuesta
    const match = content.match(/\{[\s\S]*?\}/);
    if (!match) return;

    let facts: Record<string, unknown>;
    try {
      facts = JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return;
    }

    for (const [key, value] of Object.entries(facts)) {
      if (value && typeof value === 'string' && value.trim()) {
        await this.memoriaService.upsert(chatId, key, value.trim());
        this.logger.log(`Memoria guardada [${chatId}] ${key}: ${value.trim()}`);
      }
    }
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
