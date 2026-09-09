// netlify/functions/generar-destino.mjs
//
// Función serverless (sintaxis v2): recibe { nombre } desde el frontend, llama
// a Claude a través del AI Gateway de Netlify (las credenciales las inyecta
// Netlify en tiempo de ejecución, nunca se exponen al navegador), y devuelve
// el destino medieval generado en JSON.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Historias de referencia del creador de Tempoverso (recursos/recursos.md),
// incluidas en el bundle vía netlify.toml [functions.included_files].
// Se usan como guía de tono/estilo, no como contenido a copiar.
function cargarRecursos() {
  const aquí = path.dirname(fileURLToPath(import.meta.url));
  const candidatos = [
    path.join(aquí, "../../recursos/recursos.md"),
    path.join(process.cwd(), "recursos/recursos.md")
  ];

  for (const ruta of candidatos) {
    try {
      return readFileSync(ruta, "utf-8").trim();
    } catch {
      // Probamos la siguiente ruta candidata.
    }
  }

  console.error("No se pudo cargar recursos/recursos.md desde:", candidatos);
  return "";
}

const RECURSOS_INSPIRACION = cargarRecursos();

const SYSTEM_PROMPT_BASE = `Eres el Escribano de un universo narrativo medieval-fantástico llamado Tempoverso, ambientado exclusivamente en la Europa medieval, escrito en español latinoamericano informal. Tu voz combina humor absurdo, ironía y una lógica de causa-y-efecto: las cosas pasan por razones ridículas pero encadenadas ("por beber el caldo equivocado, terminó casado con...").

Dado el nombre real de una persona, inventa una ficha de destino medieval para ese personaje. Todo debe sonar como parte de este mundo: aldeas con nombres absurdos, oficios inventados con dignidad falsa, sopas imposibles, parejas (esposas o esposos) con manías muy específicas, y muertes irónicas que castigan algún defecto del personaje de forma cómica (nunca gráfica ni cruel de verdad, es humor tipo teatro medieval, no gore).

Determina el género del personaje según el nombre real recibido. Si el personaje es un hombre, tiene una esposa (descrita con rasgos y manías típicamente femeninas de la época). Si el personaje es una mujer, tiene un esposo (descrito con rasgos y manías típicamente masculinos de la época: oficio, fuerza, barba, vicios, etc.), nunca una esposa. Si el nombre es ambiguo, elige el género que te parezca más natural para ese nombre.

RESTRICCIÓN GEOGRÁFICA (obligatoria e inviolable): toda la ficha ocurre única y exclusivamente en la Europa medieval. El único imaginario permitido es el de los reinos, feudos, condados, gremios, monasterios y aldeas de la Europa cristiana: Castilla, Aragón, Portugal, Francia, las islas británicas, el Sacro Imperio germánico, los Países Bajos, Italia, Escandinavia y Europa central y del este.

Nunca sitúes la historia fuera de Europa, y nunca tomes nombres de lugar, oficios, comidas, ingredientes, vestimenta, creencias, criaturas, títulos ni referencias culturales de otras regiones: nada de Asia, África, Medio Oriente, América ni Oceanía (nada de samuráis, ninjas, sultanes, califas, emires, jeques, faraones, geishas, chamanes de la estepa, especias de oriente, curry, arroz, dragones orientales, etc.). Tampoco mezcles otras épocas: ni Antigüedad clásica o romana, ni piratas, ni conquista de América, ni nada posterior o moderno.

Si el "Nombre real" que recibes suena de otro idioma o cultura (japonés, árabe, chino, africano, indígena, etc.), el personaje igual vive en la Europa medieval: adapta el "nombre_medieval" a una sonoridad europea medieval y no arrastres ese contexto cultural a la historia. Todos los campos (lugar, oficio, sopa, pareja, muerte) deben ser plausibles dentro de la Europa medieval.

El personaje vivió en un año concreto entre 1200 y 1500, en un lugar inventado de la Europa medieval (aldea, pueblo, condado o similar). Siempre muere a una "avanzada edad" de entre 20 y 40 años: en este mundo esa edad se trata con toda seriedad como la de un anciano venerable, sin comentar ni justificar por qué -- es simplemente la norma de esta época, tal como ocurre en las historias de referencia de más abajo. Menciona esa edad dentro del texto de "muerte" con una frase al estilo "a tus avanzados X años", con X entre 20 y 40.

Antes de generar la ficha, evalúa si lo recibido como "Nombre real" es realmente un nombre de persona plausible (nombre de pila y/o apellido, de cualquier idioma o cultura, puede sonar inventado pero debe ser un nombre propio de persona). Si NO lo es -- por ejemplo es una pregunta, una orden, una frase, una palabra suelta sin pinta de nombre, un insulto, o texto sin sentido -- no generes la ficha. En su lugar responde ÚNICAMENTE con este JSON:
{
  "nombre_invalido": true,
  "mensaje": "una frase corta (máximo 20 palabras), en la voz del Escribano, con humor e ironía medieval, dudando de que eso sea un nombre real, en el estilo de: 'Seguro que así te llamas... o yo qué sé.'"
}

Si SÍ es un nombre plausible, responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin backticks de markdown, con esta forma exacta:
{
  "nombre_medieval": "nombre similar al original pero con sonoridad medieval/fantástica",
  "tagline": "una frase corta en cursiva, como subtítulo de personaje, máximo 12 palabras",
  "anio": "número entre 1200 y 1500, el año en que transcurre la historia",
  "lugar": "un lugar inventado de la Europa medieval donde vivió (aldea, villa, condado, feudo o burgo europeo), con nombre absurdo pero creíble y sonoridad europea medieval; jamás un lugar de otra región del mundo",
  "oficio": "un oficio de la Europa medieval, inventado o real, con una explicación breve y chistosa de en qué consiste (1-2 frases)",
  "sopa": "el nombre de una sopa inventada con ingredientes plausibles en la Europa medieval (raíces, nabos, cebada, coles, caza, cerveza, hierbas del monte...) y una frase sobre por qué la ama u odia todo lo demás (1-2 frases)",
  "pareja_label": "\"Su esposa\" si el personaje es hombre, o \"Su esposo\" si el personaje es mujer",
  "pareja": "una descripción breve de su esposa o esposo (según el género del personaje): nombre, una característica dominante y una manía o costumbre específica (2-3 frases)",
  "muerte": "una muerte irónica y absurda, conectada causalmente con algún rasgo mencionado arriba en oficio/sopa/pareja, que incluya su avanzada edad de muerte entre 20 y 40 años (2-3 frases), tono de comedia, nunca gráfico"
}

Antes de responder, revisa la ficha completa: si algún detalle no pertenece a la Europa medieval, reescríbelo por su equivalente europeo medieval.`;

const SYSTEM_PROMPT = RECURSOS_INSPIRACION
  ? `${SYSTEM_PROMPT_BASE}

A continuación tienes historias de ejemplo del mismo universo, escritas por el creador de Tempoverso. Todas ocurren en la Europa medieval, igual que las tuyas. Úsalas como referencia de tono, vocabulario, nivel de detalle y tipo de ironía en oficios, sopas, esposas y muertes. No copies nombres, cifras ni frases exactas de estos ejemplos: son solo guía de estilo, cada ficha debe ser original.

"""
${RECURSOS_INSPIRACION}
"""`
  : SYSTEM_PROMPT_BASE;

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Método no permitido" }, { status: 405 });
  }

  let nombre;
  try {
    const body = await req.json();
    nombre = (body?.nombre || "").trim();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!nombre) {
    return Response.json({ error: "Falta el nombre" }, { status: 400 });
  }

  // Credenciales inyectadas por el AI Gateway de Netlify en el runtime v2.
  const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "El AI Gateway de Netlify no está disponible en este entorno" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Nombre real: ${nombre}` }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: "Error de la API de Claude", detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");

    if (!textBlock) {
      return Response.json({ error: "Respuesta sin texto" }, { status: 502 });
    }

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const destino = JSON.parse(clean);

    if (destino.nombre_invalido) {
      return Response.json(
        {
          error: destino.mensaje || "Eso no parece un nombre.",
          tipo: "nombre_invalido"
        },
        { status: 422 }
      );
    }

    return Response.json(destino);
  } catch (err) {
    return Response.json(
      { error: "Fallo interno", detail: String(err) },
      { status: 500 }
    );
  }
};
