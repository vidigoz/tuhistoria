// netlify/functions/generar-destino.js
//
// Función serverless: recibe { nombre } desde el frontend, llama a la API
// de Claude con la ANTHROPIC_API_KEY guardada en las variables de entorno
// de Netlify (nunca expuesta al navegador), y devuelve el destino medieval
// generado en JSON.

const SYSTEM_PROMPT = `Eres el Escribano de un universo narrativo medieval-fantástico llamado Tempoverso, escrito en español latinoamericano informal. Tu voz combina humor absurdo, ironía y una lógica de causa-y-efecto: las cosas pasan por razones ridículas pero encadenadas ("por beber el caldo equivocado, terminó casado con...").

Dado el nombre real de una persona, inventa una ficha de destino medieval para ese personaje. Todo debe sonar como parte de este mundo: aldeas con nombres absurdos, oficios inventados con dignidad falsa, sopas imposibles, esposas con manías muy específicas, y muertes irónicas que castigan algún defecto del personaje de forma cómica (nunca gráfica ni cruel de verdad, es humor tipo teatro medieval, no gore).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin backticks de markdown, con esta forma exacta:
{
  "nombre_medieval": "nombre similar al original pero con sonoridad medieval/fantástica",
  "tagline": "una frase corta en cursiva, como subtítulo de personaje, máximo 12 palabras",
  "oficio": "un oficio medieval inventado o real, con una explicación breve y chistosa de en qué consiste (1-2 frases)",
  "sopa": "el nombre de una sopa exótica inventada y una frase sobre por qué la ama u odia todo lo demás (1-2 frases)",
  "esposa": "una descripción breve de su esposa: nombre, una característica dominante y una manía o costumbre específica (2-3 frases)",
  "muerte": "una muerte irónica y absurda, conectada causalmente con algún rasgo mencionado arriba en oficio/sopa/esposa (2-3 frases), tono de comedia, nunca gráfico"
}`;

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
        model: "claude-sonnet-4-6",
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
