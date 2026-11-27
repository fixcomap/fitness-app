// Proveedor de IA falso para desarrollo (IA_PROVEEDOR=falso): respuestas fijas según palabras del último
// mensaje, sin red y sin costo. Sirve para probar la app (por ejemplo con Expo Go) contra la API local.
// En producción no se puede usar (ver config.js).
const { pideTodo } = require('./acciones');

// Valores de la base de alimentos de la app (apps/mobile/src/data/alimentosCaseros.json), por 100 g.
const MILANESA = {
  nombre: 'Milanesa de carne frita',
  gramos: 150,
  kcal: 238,
  proteinas: 27.3,
  carbos: 9.9,
  grasas: 9.2,
};
const EMPANADA = { gramos: 90, kcal: 333, proteinas: 12.1, carbos: 27.5, grasas: 19.2 };

const USO = { entrada: 0, cacheLectura: 0, cacheEscritura: 0, salida: 0 };
// El consejo del día de prueba: siempre el mismo.
const CONSEJO = {
  texto: 'Consejo de prueba (IA_PROVEEDOR=falso): sumá una porción de proteína en tu próxima comida.',
  destino: 'comida',
};
const AYUDA =
  'Soy el coach de prueba (IA_PROVEEDOR=falso). Probá con: "armame una rutina", "agregá curl a mi rutina", ' +
  '"sacá un ejercicio", "borrá la rutina", "comí 2 empanadas" o "caminé 3 km".';

const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const porGramos = (alimento, gramos) => {
  const factor = gramos / 100;
  const redondear = (x) => Math.round(x * factor * 10) / 10;
  return {
    kcal: redondear(alimento.kcal),
    proteinas: redondear(alimento.proteinas),
    carbos: redondear(alimento.carbos),
    grasas: redondear(alimento.grasas),
  };
};

const nueva = (nombre, dia, ...ids) => ({
  tipo: 'crear_rutina',
  nombre,
  dia,
  ejercicios: ids.map((ejercicioId) => ({ ejercicioId, series: 3 })),
});

// { texto, acciones } según lo que pidió el usuario en su último mensaje.
function respuestaCoach(mensajes, contexto) {
  const pedido = mensajes.at(-1)?.texto ?? '';
  const texto = normalizar(pedido);
  const rutinas = contexto?.rutinas ?? [];
  const hoy = contexto?.hoy;
  const nombres = rutinas.map((r) => `"${r.nombre}"`).join(', ');

  if (texto.includes('borr')) {
    if (rutinas.length === 0) return { texto: 'No tenés rutinas para borrar.', acciones: [] };
    if (rutinas.length > 1 && !pideTodo(pedido)) {
      return { texto: `¿Cuál querés borrar? Tenés ${nombres}.`, acciones: [] };
    }
    return {
      texto: 'Te dejo el borrado para que lo confirmes.',
      acciones: [{ tipo: 'borrar_rutinas', rutinaIds: rutinas.map((r) => r.id) }],
    };
  }
  if (texto.includes('agreg')) {
    if (rutinas.length === 0) return { texto: 'Primero armá una rutina.', acciones: [] };
    return {
      texto: `Te dejo curl de bíceps para sumar a "${rutinas[0].nombre}".`,
      acciones: [
        { tipo: 'agregar_ejercicios', rutinaId: rutinas[0].id, ejercicios: [{ ejercicioId: 'curl-barra', series: 3 }] },
      ],
    };
  }
  if (texto.includes('saca') || texto.includes('quita')) {
    const rutina = rutinas.find((r) => r.ejercicios.length > 1);
    if (!rutina) return { texto: 'No hay ningún ejercicio para sacar sin dejar la rutina vacía.', acciones: [] };
    return {
      texto: `Te dejo para sacar el último ejercicio de "${rutina.nombre}".`,
      acciones: [
        { tipo: 'quitar_ejercicios', rutinaId: rutina.id, ejercicioIds: [rutina.ejercicios.at(-1).ejercicioId] },
      ],
    };
  }
  if (texto.includes('rutina')) {
    return {
      texto: 'Te dejo pecho y tríceps, espalda y bíceps y piernas para que las apliques.',
      acciones: [
        nueva('Pecho y tríceps', 0, 'press-banca-barra', 'press-inclinado-mancuernas', 'fondos-paralelas', 'extension-triceps-polea-cabeza'),
        nueva('Espalda y bíceps', 2, 'remo-barra', 'jalon-al-pecho', 'face-pull', 'curl-barra'),
        nueva('Piernas', 4, 'sentadilla-barra', 'peso-muerto-rumano-mancuernas', 'curl-femoral-sentado', 'gemelos-de-pie-maquina'),
      ],
    };
  }
  if (/comi|cene|almorce|desayune|meriende/.test(texto)) {
    return {
      texto: 'Te dejo 2 empanadas de carne para registrar. Asumí que son al horno, ya cocidas.',
      acciones: [
        {
          tipo: 'registrar_comida',
          dia: hoy,
          comida: 'almuerzo',
          items: [
            {
              busqueda: 'empanada de carne',
              estado: 'cocido',
              estadoAsumido: true,
              cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: EMPANADA.gramos },
              estimado: porGramos(EMPANADA, 100),
            },
          ],
        },
      ],
    };
  }
  if (/camin|km|pasos/.test(texto)) {
    return {
      texto: 'Te dejo 3 km de caminata para cargar.',
      acciones: [{ tipo: 'cargar_pasos', dia: hoy, unidad: 'km', valor: 3, hora: null }],
    };
  }
  return { texto: AYUDA, acciones: [] };
}

function crearProveedorFalso() {
  return {
    nombre: 'falso',
    async analizarFoto() {
      // Una milanesa de 150 g con los valores de la base de la app; confianza fija de prueba.
      const item = { nombre: MILANESA.nombre, gramos: MILANESA.gramos, ...porGramos(MILANESA, MILANESA.gramos) };
      return { datos: { items: [{ ...item, confianza: 0.5 }] }, uso: USO, modelo: 'falso' };
    },
    async responderCoach(mensajes, contexto) {
      return { datos: respuestaCoach(mensajes, contexto), uso: USO, modelo: 'falso' };
    },
    async darConsejo() {
      return { datos: CONSEJO, uso: USO, modelo: 'falso' };
    },
  };
}

module.exports = { CONSEJO, crearProveedorFalso, respuestaCoach };
