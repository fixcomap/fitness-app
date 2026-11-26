// Claude, con clave de Anthropic o en Vertex AI (cuenta de servicio). Misma forma de pedido para los dos.
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { esquemaSalidaCoach, esquemaSalidaFoto } = require('./esquemas');
const { SISTEMA_COACH, SISTEMA_FOTO, contextoCoach, textoFoto } = require('./prompts');
const { ErrorIa, historialDesdeUsuario } = require('./proveedor');

const ESPERA_MS = 60 * 1000;
const MAXIMO_TOKENS = 16000;

// Si el modelo rechaza un pedido por sus filtros de seguridad (puede pasar con uno inocente),
// el SDK lo reintenta con este otro modelo.
const RESPALDO = {
  'claude-opus-5-5': 'claude-opus-4-8',
  'claude-opus-5': 'claude-opus-4-8',
  'claude-fable-5-2': 'claude-opus-4-8',
  'claude-sonnet-5-5': 'claude-sonnet-5',
};

// Devuelve una función modelo -> cliente (uno por modelo, por el respaldo).
function crearClientesClaude({ clave, vertex }) {
  const { default: Anthropic, betaRefusalFallbackMiddleware } = require('@anthropic-ai/sdk');
  const clientes = new Map();
  return (modelo) => {
    if (!clientes.has(modelo)) {
      const respaldo = RESPALDO[modelo];
      const opciones = {
        timeout: ESPERA_MS,
        maxRetries: 1,
        middleware: respaldo ? [betaRefusalFallbackMiddleware([{ model: respaldo }])] : [],
      };
      if (vertex) {
        const { AnthropicVertex } = require('@anthropic-ai/vertex-sdk');
        clientes.set(modelo, new AnthropicVertex({ ...opciones, projectId: vertex.proyecto, region: vertex.region }));
      } else {
        clientes.set(modelo, new Anthropic({ ...opciones, apiKey: clave }));
      }
    }
    return clientes.get(modelo);
  };
}

function leerRespuesta(respuesta) {
  if (respuesta.stop_reason === 'refusal') throw new ErrorIa('rechazo', 'Claude no respondió (rechazo)');
  if (respuesta.stop_reason === 'max_tokens') throw new ErrorIa('incompleta', 'Claude cortó la respuesta');
  if (!respuesta.parsed_output) throw new ErrorIa('formato', 'Claude no devolvió el JSON pedido');
  const uso = respuesta.usage ?? {};
  return {
    datos: respuesta.parsed_output,
    uso: {
      entrada: (uso.input_tokens ?? 0) + (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0),
      salida: uso.output_tokens ?? 0,
    },
    modelo: respuesta.model,
  };
}

// clientePara: modelo -> cliente de Anthropic (o uno falso en los tests).
function crearProveedorClaude({ clientePara, modeloFoto, modeloCoach, nombre = 'claude' }) {
  async function pedir(modelo, system, messages, esquema) {
    let respuesta;
    try {
      respuesta = await clientePara(modelo).messages.parse({
        model: modelo,
        max_tokens: MAXIMO_TOKENS,
        system,
        messages,
        output_config: { format: zodOutputFormat(esquema) },
      });
    } catch (error) {
      // El SDK valida el JSON contra el esquema: si no cierra, es un error de formato.
      if (error instanceof SyntaxError || error?.name === 'ZodError') {
        throw new ErrorIa('formato', 'Claude no devolvió el JSON pedido');
      }
      throw error;
    }
    return leerRespuesta(respuesta);
  }

  return {
    nombre,
    analizarFoto(imagen, { comida = null } = {}) {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imagen.toString('base64') } },
            { type: 'text', text: textoFoto(comida) },
          ],
        },
      ];
      return pedir(modeloFoto, SISTEMA_FOTO, messages, esquemaSalidaFoto);
    },
    responderCoach(mensajes, contexto) {
      const messages = historialDesdeUsuario(mensajes).map((m) => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      }));
      const system = [
        { type: 'text', text: SISTEMA_COACH },
        { type: 'text', text: contextoCoach(contexto) },
      ];
      return pedir(modeloCoach, system, messages, esquemaSalidaCoach);
    },
  };
}

module.exports = { RESPALDO, crearClientesClaude, crearProveedorClaude };
