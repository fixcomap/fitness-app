// Gemini, con clave (Gemini API) o en Vertex AI (cuenta de servicio). Mismo SDK para los dos.
const { esquemaSalidaCoach, esquemaSalidaFoto, jsonSchema } = require('./esquemas');
const { SISTEMA_COACH, SISTEMA_FOTO, MANUAL_COACH, contextoCoach, textoFoto } = require('./prompts');
const { ErrorIa, historialDesdeUsuario } = require('./proveedor');

const ESPERA_MS = 60 * 1000;

function crearClienteGemini({ clave, vertex }) {
  const { GoogleGenAI } = require('@google/genai');
  const http = { timeout: ESPERA_MS };
  return vertex
    ? new GoogleGenAI({ vertexai: true, project: vertex.proyecto, location: vertex.region, httpOptions: http })
    : new GoogleGenAI({ apiKey: clave, httpOptions: http });
}

function leerRespuesta(respuesta, modelo) {
  const candidato = respuesta.candidates?.[0];
  if (!candidato || ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(candidato.finishReason)) {
    throw new ErrorIa('rechazo', `Gemini no respondió (${candidato?.finishReason ?? 'sin candidatos'})`);
  }
  if (candidato.finishReason === 'MAX_TOKENS') throw new ErrorIa('incompleta', 'Gemini cortó la respuesta');
  let datos;
  try {
    datos = JSON.parse(respuesta.text ?? '');
  } catch {
    throw new ErrorIa('formato', 'Gemini no devolvió JSON');
  }
  const uso = respuesta.usageMetadata ?? {};
  return {
    datos,
    uso: {
      // promptTokenCount ya incluye los tokens que salieron de la caché implícita.
      entrada: uso.promptTokenCount ?? 0,
      cacheLectura: uso.cachedContentTokenCount ?? 0,
      cacheEscritura: 0,
      salida: (uso.candidatesTokenCount ?? 0) + (uso.thoughtsTokenCount ?? 0),
    },
    modelo,
  };
}

// cliente: un GoogleGenAI (o uno falso en los tests).
function crearProveedorGemini({ cliente, modeloFoto, modeloCoach, nombre = 'gemini' }) {
  async function pedir(modelo, sistema, contents, esquema) {
    const respuesta = await cliente.models.generateContent({
      model: modelo,
      contents,
      config: {
        systemInstruction: sistema,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema(esquema),
      },
    });
    return leerRespuesta(respuesta, modelo);
  }

  return {
    nombre,
    analizarFoto(imagen, { comida = null } = {}) {
      const contents = [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imagen.toString('base64') } },
            { text: textoFoto(comida) },
          ],
        },
      ];
      return pedir(modeloFoto, SISTEMA_FOTO, contents, esquemaSalidaFoto);
    },
    responderCoach(mensajes, contexto) {
      const contents = historialDesdeUsuario(mensajes).map((m) => ({
        role: m.rol === 'usuario' ? 'user' : 'model',
        parts: [{ text: m.texto }],
      }));
      // Gemini cachea solo los prefijos repetidos: instrucciones y manual primero, el contexto al final.
      const sistema = `${SISTEMA_COACH}\n\n${MANUAL_COACH}\n\n${contextoCoach(contexto)}`;
      return pedir(modeloCoach, sistema, contents, esquemaSalidaCoach);
    },
  };
}

module.exports = { crearClienteGemini, crearProveedorGemini };
