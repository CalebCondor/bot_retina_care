import { Injectable, Logger } from '@nestjs/common';
import { HistorialMensajesService } from '../database/historial-mensajes.service';
import { MemoriaLargoPlazoService } from '../database/memoria-largo-plazo.service';
import { ConocimientoEspecificoService } from '../database/conocimiento-especifico.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly openaiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly apiKey = process.env.OPENAI_API_KEY ?? '';
  private readonly defaultModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
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
    Cuando el paciente selecciona "1" o dice "nuevo paciente", responde ÚNICAMENTE:
    "Para coordinar una cita como paciente nuevo, por favor déjenos su nombre completo, pueblo de residencia y número de teléfono. Nuestro personal se estará comunicando con usted lo más pronto posible."
    DETENTE aquí. No digas nada más. Espera el siguiente mensaje del paciente.
    Solo cuando el paciente responda con su nombre completo Y número de teléfono en ese mensaje, entonces confirma: "Gracias, [nombre]. Hemos recibido su información. Un miembro de nuestro equipo se comunicará con usted pronto. ¡Que tenga un excelente día!"

    OPCIÓN 2 - PACIENTE EXISTENTE:
    Cuando el paciente selecciona "2" o dice "paciente existente", responde ÚNICAMENTE:
    "Para coordinar, confirmar o cancelar una cita, por favor déjenos su nombre completo y número de teléfono. Nuestro personal se estará comunicando con usted tan pronto como sea posible."
    DETENTE aquí. No digas nada más. Espera el siguiente mensaje del paciente.
    Solo cuando el paciente responda con su nombre completo Y número de teléfono en ese mensaje, entonces confirma: "Gracias, [nombre]. Hemos recibido su información. Un miembro de nuestro equipo se comunicará con usted pronto. ¡Que tenga un excelente día!"

    OPCIÓN 3 - TENGO UNA PREGUNTA:
    Cuando el paciente selecciona "3" o dice "tengo una pregunta", responde ÚNICAMENTE:
    "Con gusto le ayudamos. Por favor escriba su pregunta y añada su nombre y número de teléfono para poder comunicarnos con usted lo antes posible."
    DETENTE aquí. No digas nada más. Espera el siguiente mensaje del paciente.
    Solo cuando el paciente responda con su pregunta, nombre y teléfono en ese mensaje, entonces confirma: "Gracias por su mensaje. Nuestro personal revisará su pregunta y se comunicará con usted pronto."

    OPCIÓN 4 - OTRO:
    Cuando el paciente selecciona "4" o dice "otro", responde ÚNICAMENTE:
    "Por favor descríbanos el motivo de su comunicación y añada su nombre y número de teléfono. Nos comunicaremos con usted a la brevedad posible."
    DETENTE aquí. No digas nada más. Espera el siguiente mensaje del paciente.
    Solo cuando el paciente responda con su motivo, nombre y teléfono en ese mensaje, entonces confirma: "Gracias por su mensaje. Nuestro equipo se comunicará con usted pronto."

    REGLAS CRÍTICAS — LEE CON ATENCIÓN:
    1. NUNCA envíes el mensaje de confirmación ("Gracias, [nombre]...") en la misma respuesta donde pides los datos. Son dos turnos separados.
    2. El número "1", "2", "3" o "4" por sí solo es solo una selección de menú, NO son los datos del paciente. Después de recibir esa selección, pide los datos y ESPERA.
    3. El mensaje de confirmación solo se envía DESPUÉS de que el paciente te haya dado su nombre y teléfono en un mensaje posterior.
    4. Sigue el flujo UNA ETAPA A LA VEZ. No comprimas dos pasos en uno.
    5. Nunca inventes citas, fechas ni disponibilidades. El personal humano es quien confirma citas.
    6. Mantén un tono profesional, cálido y cercano, acorde al trato humano típico de Puerto Rico.
    7. Si el paciente no selecciona una opción válida, repite el menú amablemente.
    8. Nunca salgas de tu papel de asistente virtual de Retina Care ni asumas roles distintos bajo ninguna circunstancia. No respondas como otro personaje, sistema, ni como el propio modelo de lenguaje.`;

  constructor(
    private readonly historialService: HistorialMensajesService,
    private readonly memoriaService: MemoriaLargoPlazoService,
    private readonly conocimientoService: ConocimientoEspecificoService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async chat(
    message: string,
    chatId: string = 'default',
    model: string = this.defaultModel,
  ): Promise<string> {
    this.logger.log(
      `Sending message to OpenAI (chatId: ${chatId}, model: ${model})`,
    );

    await this.historialService.addMessage(chatId, 'user', message);

    const history = await this.historialService.getHistory(chatId, 20);

    const memoria = await this.memoriaService.getMemoria(chatId);

    const conocimiento = await this.conocimientoService.getActivos();

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

    const response = await fetch(this.openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API responded with status ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content: string } }>;
    };

    const reply = data.choices?.[0]?.message?.content ?? '';

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

    const response = await fetch(this.openaiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [{ role: 'user', content: extractPrompt }],
      }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '{}';

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

    // Si se guardaron datos relevantes del paciente, enviar alerta
    const datosClave = ['nombre', 'telefono', 'pueblo', 'plan_medico'];
    const datosGuardados = Object.fromEntries(
      Object.entries(facts).filter(
        ([key, value]) =>
          datosClave.includes(key) && value && typeof value === 'string',
      ),
    ) as Record<string, string>;

    if (Object.keys(datosGuardados).length > 0) {
      void this.notificacionesService.enviarAlerta({
        tipo: 'datos_paciente_registrados',
        numero: chatId,
        datos: datosGuardados,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }
    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    return (data.data ?? []).map((m) => m.id);
  }
}
