// Interfaz común de los proveedores de IA.
//
// Proveedor {
//   nombre: string
//   analizarFoto(imagen: Buffer, contexto: { comida: string | null }): Promise<Respuesta>
//   responderCoach(mensajes: { rol: 'usuario' | 'coach', texto: string }[], contexto: object): Promise<Respuesta>
// }
// Respuesta { datos: unknown, uso: { entrada: number, salida: number }, modelo: string }
//
// `datos` es el JSON que devolvió el modelo, todavía sin validar: lo validan foto.js y coach.js.
// `uso` son los tokens de entrada y de salida (con los de razonamiento), para estimar el costo.

// Errores de la IA que no son de red: el modelo no quiso responder o respondió algo inválido.
class ErrorIa extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.name = 'ErrorIa';
    this.tipo = tipo; // 'rechazo' | 'incompleta' | 'formato'
  }
}

// El historial del chat para la IA: arranca siempre con un mensaje del usuario.
function historialDesdeUsuario(mensajes) {
  const primero = mensajes.findIndex((m) => m.rol === 'usuario');
  return primero === -1 ? [] : mensajes.slice(primero);
}

module.exports = { ErrorIa, historialDesdeUsuario };
