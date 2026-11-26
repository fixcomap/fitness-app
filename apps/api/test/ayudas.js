// Ayudas para los tests de las rutas de IA: IA falsa, uso diario en memoria y un cliente HTTP.
const { crearApp } = require('../src/app');

const DISPOSITIVO = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const OTRO_DISPOSITIVO = '9b1c2d3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e';

// Responde lo que se le pase (o tira el error) y guarda con qué se la llamó.
function iaFalsa({ foto, coach, error } = {}) {
  const llamadas = [];
  const responder = (datos) => {
    if (error) throw error;
    return { datos, uso: { entrada: 100, salida: 50 }, modelo: 'falso' };
  };
  return {
    nombre: 'falsa',
    llamadas,
    async analizarFoto(imagen, contexto) {
      llamadas.push({ tipo: 'foto', imagen, contexto });
      return responder(foto);
    },
    async responderCoach(mensajes, contexto) {
      llamadas.push({ tipo: 'coach', mensajes, contexto });
      return responder(coach);
    },
  };
}

// Misma interfaz que crearUsoDiario(pool), en memoria.
function usoEnMemoria() {
  const usos = new Map();
  const clave = (usuario, tipo) => `${usuario}:${tipo}`;
  return {
    usos,
    usados: (usuario, tipo) => usos.get(clave(usuario, tipo)) ?? 0,
    async consumir(usuario, tipo, limite) {
      const usados = usos.get(clave(usuario, tipo)) ?? 0;
      if (usados >= limite) return { permitido: false, usados };
      usos.set(clave(usuario, tipo), usados + 1);
      return { permitido: true, usados: usados + 1 };
    },
    async devolver(usuario, tipo) {
      usos.set(clave(usuario, tipo), Math.max(0, (usos.get(clave(usuario, tipo)) ?? 0) - 1));
    },
  };
}

// Levanta la app con las opciones dadas y devuelve pedir(metodo, ruta, { headers, cuerpo }).
async function conApp(opciones, prueba) {
  const servidor = crearApp({ pool: { query: async () => ({ rows: [] }) }, ...opciones }).listen(0);
  try {
    const { port } = servidor.address();
    await prueba(async (metodo, ruta, { headers = {}, cuerpo } = {}) => {
      const res = await fetch(`http://127.0.0.1:${port}${ruta}`, { method: metodo, headers, body: cuerpo });
      const texto = await res.text();
      return { status: res.status, headers: res.headers, body: texto ? JSON.parse(texto) : null };
    });
  } finally {
    servidor.close();
  }
}

// Un "JPEG" mínimo: alcanza con que empiece como uno.
const jpeg = (bytes = 100) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(bytes)]);

module.exports = { DISPOSITIVO, OTRO_DISPOSITIVO, iaFalsa, usoEnMemoria, conApp, jpeg };
