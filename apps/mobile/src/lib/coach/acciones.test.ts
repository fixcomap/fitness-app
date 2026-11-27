import { ALIMENTOS_CASEROS, type Alimento } from '../comida/alimentos';
import type { RegistroComida } from '../comida/diario';
import type { Rutina } from '../entreno/rutinas';
import ejemplo from './__fixtures__/respuesta-coach.json';
import {
  aplicar,
  aplicarAccion,
  conflictos,
  DESHACER_MS,
  describir,
  deshacerPendiente,
  diaPermitido,
  leerAccion,
  leerRespuestaCoach,
  lineaItem,
  plural,
  puedeDeshacer,
  textoCantidadAccion,
  validarContraEstado,
  type AccionCoach,
  type AccionDe,
  type EntornoAcciones,
  type EstadoConDeshacer,
  type EstadoApp,
} from './acciones';

const respuesta = leerRespuestaCoach(ejemplo.respuesta)!;
const accion = <T extends AccionCoach['tipo']>(tipo: T, n = 0) =>
  respuesta.acciones.filter((a): a is AccionDe<T> => a.tipo === tipo)[n];

const empanada = ALIMENTOS_CASEROS.find((a) => a.id === 'casera:empanada-carne')!;
const rutinas = ejemplo.contexto.rutinas as Rutina[];
const estado: EstadoApp = { rutinas, diario: [], cargas: [] };
// Jueves 26 de noviembre de 2026, 21:30 en hora local.
const AHORA = new Date(2026, 10, 26, 21, 30);
const nuevoId = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const entorno = (cambios: Partial<EntornoAcciones> = {}): EntornoAcciones => ({
  ahora: AHORA,
  perfil: { alturaCm: 175, sexo: 'hombre' },
  crearId: nuevoId(),
  alimentoPara: () => ({ alimento: empanada, cantidad: { modo: 'unidades', unidades: 2, porcion: 0 } }),
  ...cambios,
});
const aplicada = (a: AccionCoach, e: EstadoApp = estado, en = entorno()) => {
  const r = aplicar(a, e, en);
  if (!r.ok) throw new Error(r.problema.mensaje);
  return r;
};

describe('leer la respuesta de la API', () => {
  // La API arma esta misma respuesta (apps/api/test/respuestaApp.test.js).
  test('la respuesta de ejemplo de la API se lee entera', () => {
    expect(respuesta.descartados).toEqual([]);
    expect(respuesta).toEqual(ejemplo.respuesta);
    expect(respuesta.acciones.map((a) => a.tipo)).toEqual([
      'crear_rutina',
      'agregar_ejercicios',
      'quitar_ejercicios',
      'borrar_rutinas',
      'registrar_comida',
      'cargar_pasos',
      'cargar_pasos',
    ]);
  });

  test('sin texto no hay respuesta; las acciones mal formadas se descartan', () => {
    expect(leerRespuestaCoach({ acciones: [] })).toBeNull();
    expect(leerRespuestaCoach(null)).toBeNull();
    const r = leerRespuestaCoach({
      texto: ' Hola ',
      acciones: [{ id: 'x', tipo: 'mandar_mail' }, accion('borrar_rutinas'), { tipo: 'borrar_rutinas', rutinaIds: ['r'] }],
    })!;
    expect(r.texto).toBe('Hola');
    expect(r.acciones).toEqual([accion('borrar_rutinas')]);
    expect(r.descartados).toEqual([
      { accion: 'mandar_mail', motivo: 'invalida' },
      { accion: 'borrar_rutinas', motivo: 'invalida' },
    ]);
  });

  test('valida series, rangos, cantidades, valores y horas', () => {
    const crear = accion('crear_rutina');
    expect(leerAccion({ ...crear, ejercicios: [{ ejercicioId: 'prensa', series: 11, rango: { min: 6, max: 10 } }] })).toBeNull();
    expect(leerAccion({ ...crear, ejercicios: [{ ejercicioId: 'prensa', series: 3, rango: { min: 10, max: 6 } }] })).toBeNull();
    expect(leerAccion({ ...crear, dia: 7 })).toBeNull();
    expect(leerAccion({ ...crear, ejercicios: [] })).toBeNull();
    const comida = accion('registrar_comida');
    const item = comida.items[0];
    const conItem = (cambios: object) => ({ ...comida, items: [{ ...item, ...cambios }] });
    expect(leerAccion(conItem({ cantidad: { unidades: 2, porcion: 'empanada' } }))).toBeNull(); // sin gramosPorUnidad
    expect(leerAccion(conItem({ cantidad: { unidades: 2, porcion: 'empanada', gramosPorUnidad: 1001 } }))).toBeNull();
    expect(leerAccion(conItem({ cantidad: { gramos: 2001 } }))).toBeNull();
    expect(leerAccion(conItem({ estimado: { ...item.estimado, kcal: 1001 } }))).toBeNull();
    expect(leerAccion({ ...comida, comida: 'brunch' })).toBeNull();
    const pasos = accion('cargar_pasos', 1);
    expect(leerAccion({ ...pasos, valor: 60001 })).toBeNull();
    expect(leerAccion({ ...pasos, valor: 300.5 })).toBeNull();
    expect(leerAccion({ ...pasos, unidad: 'km', valor: 51 })).toBeNull();
    expect(leerAccion({ ...pasos, hora: '25:00' })).toBeNull();
    expect(leerAccion({ ...pasos, hora: null })).toEqual(pasos);
  });
});

test('diaPermitido: hoy y los 6 días anteriores', () => {
  expect(diaPermitido('2026-11-26', '2026-11-26')).toBe(true);
  expect(diaPermitido('2026-11-20', '2026-11-26')).toBe(true);
  expect(diaPermitido('2026-11-19', '2026-11-26')).toBe(false);
  expect(diaPermitido('2026-11-27', '2026-11-26')).toBe(false);
});

describe('validarContraEstado', () => {
  test('la respuesta de ejemplo se puede aplicar tal cual', () => {
    for (const a of respuesta.acciones) expect([a.tipo, validarContraEstado(a, estado, AHORA)]).toEqual([a.tipo, null]);
  });

  test('si la rutina se borró mientras tanto, no se aplica', () => {
    const sinRutinas = { ...estado, rutinas: [] };
    for (const a of [accion('agregar_ejercicios'), accion('quitar_ejercicios'), accion('borrar_rutinas')]) {
      expect(validarContraEstado(a, sinRutinas, AHORA)?.motivo).toBe('no-existe-rutina');
    }
  });

  test('ejercicios que ya están, que ya no están o que dejarían la rutina vacía', () => {
    const agregar = accion('agregar_ejercicios');
    expect(validarContraEstado({ ...agregar, ejercicios: [{ ...agregar.ejercicios[0], ejercicioId: 'remo-barra' }] }, estado, AHORA)?.motivo).toBe(
      'ya-estan',
    );
    const quitar = accion('quitar_ejercicios');
    expect(validarContraEstado({ ...quitar, ejercicioIds: ['dominadas'] }, estado, AHORA)?.motivo).toBe('no-esta-en-la-rutina');
    const todos = rutinas[0].ejercicios.map((e) => e.ejercicioId);
    expect(validarContraEstado({ ...quitar, ejercicioIds: todos }, estado, AHORA)).toEqual({
      motivo: 'rutina-vacia',
      mensaje: '"Full body A" quedaría sin ejercicios: si querés, borrala.',
    });
  });

  test('ejercicios que no están en el catálogo de la app', () => {
    const crear = accion('crear_rutina');
    const inventado = { ...crear, ejercicios: [{ ...crear.ejercicios[0], ejercicioId: 'jalon-inventado' }] };
    expect(validarContraEstado(inventado, estado, AHORA)?.motivo).toBe('no-existe');
  });

  test('comidas y pasos: si cambió el día y la fecha quedó vieja, o una hora de hoy que no llegó', () => {
    const comida = accion('registrar_comida');
    expect(validarContraEstado({ ...comida, dia: '2026-11-19' }, estado, AHORA)?.motivo).toBe('fecha-no-permitida');
    expect(validarContraEstado(comida, estado, new Date(2026, 11, 3, 9))?.motivo).toBe('fecha-no-permitida');
    const pasos = accion('cargar_pasos');
    expect(validarContraEstado({ ...pasos, dia: '2026-11-27' }, estado, AHORA)?.motivo).toBe('fecha-no-permitida');
    expect(validarContraEstado({ ...pasos, dia: '2026-11-26', hora: '22:00' }, estado, AHORA)).toEqual({
      motivo: 'hora-futura',
      mensaje: 'Las 22:00 de hoy todavía no llegaron.',
    });
  });
});

describe('conflictos', () => {
  test('borrar siempre avisa (la tarjeta pide confirmación explícita)', () => {
    expect(conflictos(accion('borrar_rutinas'), estado)).toEqual([{ tipo: 'borrado', mensaje: 'Se borra "Full body B".' }]);
    const dos = { ...accion('borrar_rutinas'), rutinaIds: ['rutina-a', 'rutina-b'] };
    expect(conflictos(dos, estado)[0].mensaje).toBe('Se borran "Full body A", "Full body B".');
  });

  test('una rutina nueva en un día que ya tiene otra', () => {
    expect(conflictos(accion('crear_rutina'), estado)).toEqual([]);
    expect(conflictos({ ...accion('crear_rutina'), dia: 0 }, estado)).toEqual([
      { tipo: 'dia-ocupado', mensaje: 'El lunes ya es de "Full body B": pasa a la rutina nueva.' },
    ]);
  });

  test('agregar o quitar cuando solo algunos ya están o ya no están', () => {
    const agregar = accion('agregar_ejercicios');
    const conRemo = { ...agregar, ejercicios: [...agregar.ejercicios, { ejercicioId: 'remo-barra', series: 3, rango: { min: 6, max: 10 } }] };
    expect(conflictos(conRemo, estado)).toEqual([
      { tipo: 'algunos-ya-estan', mensaje: 'Ya están en "Full body A" y no se repiten: Remo con barra.' },
    ]);
    const quitar = { ...accion('quitar_ejercicios'), ejercicioIds: ['press-banca-barra', 'dominadas'] };
    expect(conflictos(quitar, estado)).toEqual([{ tipo: 'algunos-no-estan', mensaje: 'No están en "Full body A": Dominadas.' }]);
  });

  test('comida que ya está cargada en esa comida y pasos de un día que ya tiene cargas', () => {
    const registro: RegistroComida = {
      id: 'r1',
      dia: '2026-11-26',
      comida: 'almuerzo',
      alimento: empanada,
      cantidad: { modo: 'gramos', gramos: 90 },
      creado: AHORA.toISOString(),
    };
    expect(conflictos(accion('registrar_comida'), { ...estado, diario: [registro] })).toEqual([
      { tipo: 'ya-cargado', mensaje: 'Ya hay Empanada de carne en almuerzo: se suma otra vez.' },
    ]);
    const conCarga = aplicada(accion('cargar_pasos')).estadoNuevo;
    expect(conflictos(accion('cargar_pasos'), conCarga)).toEqual([
      { tipo: 'ya-cargado', mensaje: 'Ese día ya tiene 1 carga manual: esta se suma.' },
    ]);
  });
});

describe('aplicar', () => {
  test('crear rutina: el id lo genera la app y el día se lo saca a la que lo tenía', () => {
    const r = aplicada({ ...accion('crear_rutina'), dia: 0 });
    expect(r.estadoNuevo.rutinas.at(-1)).toEqual({
      id: 'id-1',
      nombre: 'Piernas',
      dias: [0],
      ejercicios: accion('crear_rutina').ejercicios,
    });
    expect(r.estadoNuevo.rutinas.find((x) => x.id === 'rutina-b')?.dias).toEqual([]);
    expect(r.deshacer).toEqual({ accionId: 'a1', clave: 'rutinas', anterior: rutinas, vence: AHORA.getTime() + DESHACER_MS });
  });

  test('agregar respeta las series de la acción y no repite', () => {
    const r = aplicada(accion('agregar_ejercicios'));
    expect(r.estadoNuevo.rutinas[0].ejercicios.slice(3)).toEqual([
      { ejercicioId: 'dominadas', series: 3, rango: { min: 8, max: 15 } },
      { ejercicioId: 'curl-barra', series: 2, rango: { min: 10, max: 15 } },
    ]);
  });

  test('quitar y borrar', () => {
    expect(aplicada(accion('quitar_ejercicios')).estadoNuevo.rutinas[0].ejercicios.map((e) => e.ejercicioId)).toEqual([
      'sentadilla-barra',
      'remo-barra',
    ]);
    expect(aplicada(accion('borrar_rutinas')).estadoNuevo.rutinas.map((r) => r.id)).toEqual(['rutina-a']);
  });

  test('registrar comida: un registro por ítem con el alimento que da la base', () => {
    const pedidos: string[] = [];
    const arroz: Alimento = { ...empanada, id: 'casera:arroz', nombre: 'Arroz blanco cocido', porciones: [] };
    const r = aplicada(
      accion('registrar_comida'),
      estado,
      entorno({
        alimentoPara: (item) => {
          pedidos.push(item.busqueda);
          return item.busqueda === 'arroz blanco'
            ? { alimento: arroz, cantidad: { modo: 'gramos', gramos: 150 } }
            : { alimento: empanada, cantidad: { modo: 'unidades', unidades: 2, porcion: 0 } };
        },
      }),
    );
    expect(pedidos).toEqual(['empanada de carne', 'arroz blanco']);
    expect(r.estadoNuevo.diario.map((x) => [x.id, x.dia, x.comida, x.alimento.nombre])).toEqual([
      ['id-1', '2026-11-26', 'almuerzo', 'Empanada de carne'],
      ['id-2', '2026-11-26', 'almuerzo', 'Arroz blanco cocido'],
    ]);
    expect(r.estadoNuevo.rutinas).toBe(estado.rutinas); // solo cambia el diario
    expect(r.deshacer.clave).toBe('diario');
  });

  test('cargar pasos: con la hora que dijo, en pasos tal cual, y sin hora termina ahora', () => {
    const km = aplicada(accion('cargar_pasos')).estadoNuevo.cargas[0];
    // 5 km a 5 km/h: de 17:30 a 18:30 del miércoles.
    expect(km).toMatchObject({ id: 'id-1', dia: '2026-11-25', tipo: 'km', valor: 5, inicio: '17:30', hora: '18:30', minutos: 60 });
    const pasos = aplicada(accion('cargar_pasos', 1)).estadoNuevo.cargas[0];
    expect(pasos).toMatchObject({ dia: '2026-11-26', tipo: 'pasos', pasos: 3000, minutos: 30, inicio: '21:00', hora: '21:30' });
  });

  test('cargar pasos descuenta lo que el celu ya contó en esa franja', () => {
    const r = aplicada(accion('cargar_pasos', 1), estado, entorno({ pasosRegistrados: () => 1000 }));
    expect(r.estadoNuevo.cargas[0]).toMatchObject({ estimado: 3000, registrado: 1000, pasos: 2000, minutos: 20 });
  });

  test('cargar pasos de un día anterior sin hora: termina a las 23:59', () => {
    const { hora: _hora, ...sinHora } = accion('cargar_pasos');
    expect(aplicada(sinHora).estadoNuevo.cargas[0]).toMatchObject({ dia: '2026-11-25', inicio: '22:59', hora: '23:59' });
  });

  test('si ya no es válida no cambia nada', () => {
    const r = aplicar(accion('borrar_rutinas'), { ...estado, rutinas: [] }, entorno());
    expect(r).toEqual({ ok: false, problema: { motivo: 'no-existe-rutina', mensaje: 'Esa rutina ya no existe.' } });
  });
});

describe('deshacer', () => {
  const inicial: EstadoConDeshacer = { estado, pendiente: null };
  const aplicadaCon = (actual: EstadoConDeshacer, a: AccionCoach, ahora = AHORA) => {
    const r = aplicarAccion(actual, a, entorno({ ahora }));
    if (!r.ok) throw new Error(r.problema.mensaje);
    return r.siguiente;
  };

  test('restaura la clave que tocó la acción durante 6 segundos', () => {
    const despues = aplicadaCon(inicial, accion('borrar_rutinas'));
    const limite = new Date(AHORA.getTime() + DESHACER_MS);
    expect(puedeDeshacer(despues, 'a4', limite)).toBe(true);
    expect(deshacerPendiente(despues, limite)).toEqual({ estado, pendiente: null });
    const tarde = new Date(limite.getTime() + 1);
    expect(puedeDeshacer(despues, 'a4', tarde)).toBe(false);
    expect(deshacerPendiente(despues, tarde)).toBeNull();
  });

  test('solo toca esa clave', () => {
    const conComida = aplicadaCon(inicial, accion('registrar_comida'));
    // Pasos cargados a mano (fuera del coach) mientras tanto: no se pierden.
    const conPasos = { ...conComida, estado: { ...conComida.estado, cargas: aplicada(accion('cargar_pasos')).estadoNuevo.cargas } };
    const sinComida = deshacerPendiente(conPasos, AHORA)!;
    expect(sinComida.estado.diario).toEqual([]);
    expect(sinComida.estado.cargas).toHaveLength(1);
  });

  test('aplicar otra acción hace caducar el deshacer anterior, aunque no pasaron los 6 s', () => {
    // Dos tarjetas que tocan la misma clave: quitar un ejercicio y, enseguida, agregar otros.
    const quitado = aplicadaCon(inicial, accion('quitar_ejercicios'));
    const unSegundo = new Date(AHORA.getTime() + 1000);
    const agregado = aplicadaCon(quitado, accion('agregar_ejercicios'), unSegundo);
    expect(puedeDeshacer(agregado, 'a3', unSegundo)).toBe(false);
    expect(puedeDeshacer(agregado, 'a2', unSegundo)).toBe(true);
    // Deshacer vuelve atrás solo lo último: el ejercicio quitado sigue afuera.
    const deshecho = deshacerPendiente(agregado, unSegundo)!;
    expect(deshecho.estado.rutinas).toEqual(quitado.estado.rutinas);
    expect(deshacerPendiente(deshecho, unSegundo)).toBeNull();
  });

  test('si la acción no se puede aplicar, el deshacer pendiente sigue', () => {
    const quitado = aplicadaCon(inicial, accion('quitar_ejercicios'));
    const r = aplicarAccion(quitado, { ...accion('borrar_rutinas'), rutinaIds: ['no-existe'] }, entorno());
    expect(r.ok).toBe(false);
    expect(puedeDeshacer(quitado, 'a3', AHORA)).toBe(true);
  });
});

describe('describir', () => {
  const de = (a: AccionCoach) => describir(a, estado, entorno());

  test('rutinas con los nombres del catálogo y de las rutinas guardadas', () => {
    expect(de(accion('crear_rutina'))).toEqual({
      titulo: 'Crear rutina "Piernas"',
      lineas: ['Los sábados', 'Sentadilla con barra · 4 × 6-10', 'Prensa · 3 × 6-10', 'Hip thrust con barra · 3 × 6-10', 'Curl femoral sentado · 3 × 10-15'],
    });
    expect(de(accion('agregar_ejercicios'))).toEqual({
      titulo: 'Agregar a "Full body A"',
      lineas: ['Dominadas · 3 × 8-15', 'Curl de bíceps con barra · 2 × 10-15'],
    });
    expect(de(accion('quitar_ejercicios'))).toEqual({ titulo: 'Quitar de "Full body A"', lineas: ['Press de banca con barra'] });
    expect(de(accion('borrar_rutinas'))).toEqual({ titulo: 'Borrar "Full body B"', lineas: ['"Full body B"'] });
    expect(de({ ...accion('borrar_rutinas'), rutinaIds: ['rutina-a', 'rutina-b'] }).titulo).toBe('Borrar 2 rutinas');
    expect(de({ ...accion('crear_rutina'), dia: 0 }).lineas[0]).toBe('Los lunes');
    expect(de({ ...accion('crear_rutina'), dia: null }).lineas[0]).toBe('Sin día asignado');
    expect(describir(accion('quitar_ejercicios'), { ...estado, rutinas: [] }, entorno()).titulo).toBe(
      'Quitar de una rutina que ya no existe',
    );
  });

  test('comida con los gramos por unidad y crudo o cocido', () => {
    expect(de(accion('registrar_comida'))).toEqual({
      titulo: 'Almuerzo · Hoy, jue 26',
      lineas: ['Empanada de carne · 2 empanadas · ~90 g c/u · cocido (supuesto)', 'Arroz blanco · 150 g · cocido'],
    });
  });

  test('pasos en la unidad que dijo, con los pasos estimados', () => {
    expect(de(accion('cargar_pasos'))).toEqual({
      titulo: 'Caminata · Ayer, mié 25',
      lineas: ['5 km · ≈ 6.885 pasos · hasta las 18:30'],
    });
    expect(de(accion('cargar_pasos', 1)).lineas).toEqual(['3.000 pasos']);
    expect(de({ ...accion('cargar_pasos', 1), unidad: 'minutos', valor: 40 }).lineas).toEqual(['40 min · ≈ 4.000 pasos']);
  });

  test('textos de cantidades', () => {
    expect(textoCantidadAccion({ unidades: 1, porcion: 'milanesa', gramosPorUnidad: 150 })).toBe('1 milanesa · ~150 g');
    expect(textoCantidadAccion({ unidades: 1.5, porcion: 'porción', gramosPorUnidad: 120 })).toBe('1,5 porciones · ~120 g c/u');
    expect(textoCantidadAccion({ gramos: 1200 })).toBe('1.200 g');
    expect(plural('pan')).toBe('panes');
    const manzana = { ...accion('registrar_comida').items[1], busqueda: 'manzana', estado: 'no-aplica' as const };
    expect(lineaItem(manzana)).toBe('Manzana · 150 g');
  });
});
