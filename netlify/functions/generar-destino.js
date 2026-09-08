// netlify/functions/generar-destino.js
//
// Función serverless: recibe { nombre } desde el frontend, llama a la API
// de Claude con la ANTHROPIC_API_KEY guardada en las variables de entorno
// de Netlify (nunca expuesta al navegador), y devuelve el destino medieval
// generado en JSON.

const fs = require("fs");
const path = require("path");

// Historias de referencia del creador de Tempoverso (recursos/recursos.md),
// incluidas en el bundle vía netlify.toml [functions.included_files].
// Se usan como guía de tono/estilo, no como contenido a copiar.
function cargarRecursos() {
  try {
    const ruta = path.join(__dirname, "../../recursos/recursos.md");
    return fs.readFileSync(ruta, "utf-8").trim();
  } catch (err) {
    console.error("No se pudo cargar recursos/recursos.md:", err);
    return "";
  }
}

const RECURSOS_INSPIRACION = cargarRecursos();

const SYSTEM_PROMPT_BASE = `Eres el Escribano de un universo narrativo medieval-fantástico llamado Tempoverso, escrito en español latinoamericano informal. Tu voz combina humor absurdo, ironía y una lógica de causa-y-efecto: las cosas pasan por razones ridículas pero encadenadas ("por beber el caldo equivocado, terminó casado con...").

Dado el nombre real de una persona, inventa una ficha de destino medieval para ese personaje. Todo debe sonar como parte de este mundo: aldeas con nombres absurdos, oficios inventados con dignidad falsa, sopas imposibles, esposas con manías muy específicas, y muertes irónicas que castigan algún defecto del personaje de forma cómica (nunca gráfica ni cruel de verdad, es humor tipo teatro medieval, no gore).

El personaje vivió en un año concreto entre 1200 y 1500, en un lugar inventado de la Europa medieval (aldea, pueblo, condado o similar). Siempre muere a una "avanzada edad" de entre 20 y 40 años: en este mundo esa edad se trata con toda seriedad como la de un anciano venerable, sin comentar ni justificar por qué -- es simplemente la norma de esta época, tal como ocurre en las historias de referencia de más abajo. Menciona esa edad dentro del texto de "muerte" con una frase al estilo "a tus avanzados X años", con X entre 20 y 40.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin backticks de markdown, con esta forma exacta:
{
  "nombre_medieval": "nombre similar al original pero con sonoridad medieval/fantástica",
  "tagline": "una frase corta en cursiva, como subtítulo de personaje, máximo 12 palabras",
  "anio": "número entre 1200 y 1500, el año en que transcurre la historia",
  "lugar": "un lugar inventado de la Europa medieval donde vivió, con nombre absurdo pero creíble",
  "oficio": "un oficio medieval inventado o real, con una explicación breve y chistosa de en qué consiste (1-2 frases)",
  "sopa": "el nombre de una sopa exótica inventada y una frase sobre por qué la ama u odia todo lo demás (1-2 frases)",
  "esposa": "una descripción breve de su esposa: nombre, una característica dominante y una manía o costumbre específica (2-3 frases)",
  "muerte": "una muerte irónica y absurda, conectada causalmente con algún rasgo mencionado arriba en oficio/sopa/esposa, que incluya su avanzada edad de muerte entre 20 y 40 años (2-3 frases), tono de comedia, nunca gráfico"
}`;

const SYSTEM_PROMPT = RECURSOS_INSPIRACION
  ? `${SYSTEM_PROMPT_BASE}

A continuación tienes historias de ejemplo del mismo universo, escritas por el creador de Tempoverso. Úsalas como referencia de tono, vocabulario, nivel de detalle y tipo de ironía en oficios, sopas, esposas y muertes. No copies nombres, cifras ni frases exactas de estos ejemplos: son solo guía de estilo, cada ficha debe ser original.

"""
${RECURSOS_INSPIRACION}
"""`
  : SYSTEM_PROMPT_BASE;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  let nombre;
  try {
    const body = JSON.parse(event.body || "{}");
    nombre = (body.nombre || "").trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  if (!nombre) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta el nombre" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY no está configurada en Netlify" })
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Error de la API de Claude", detail: errText })
      };
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");

    if (!textBlock) {
      return { statusCode: 502, body: JSON.stringify({ error: "Respuesta sin texto" }) };
    }

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const destino = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(destino)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fallo interno", detail: String(err) })
    };
  }
};
