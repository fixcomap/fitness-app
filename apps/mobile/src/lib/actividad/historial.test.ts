import { claveDia, type CargaPasos } from '../pasosManuales';
import { racha } from './calculos';
import {
  actualizarHistorial,
  crearTotalDelDia,
  leerHistorialGuardado,
  MAX_DIAS_HISTORIAL,
  registrosCerrados,
  serieDePasos,
  totalesVivos,
  type RegistroDia,
} from './historial';

const HOY = new Date(2026, 10, 25, 15); // miércoles 25/11

const reg = (dia: string, pasos: number, minutos = 0, conSensor = true): RegistroDia => ({ dia, pasos, minutos, conSensor });

const carga = (dia: string, pasos: number, minutos: number): CargaPasos => ({
  id: dia + pasos,
  dia,
  hora: '10:00',
  tipo: 'minutos',
  valor: minutos,
  pasos,
  minutos,
});

// `cantidad` días seguidos que terminan el día anterior a `hasta`.
const diasSeguidos = (cantidad: number, hasta: Date) =>
  Array.from({ length: cantidad }, (_, i) =>
    reg(claveDia(new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate() - cantidad + i)), i),
  );

describe('leerHistorialGuardado', () => {
  test('cualquier cosa que no sea una lista da vacío', () => {
    expect(leerHistorialGuardado(null)).toEqual([]);
    expect(leerHistorialGuardado({ dia: '2026-11-24' })).toEqual([]);
  });

  test('descarta registros mal formados', () => {
    const datos = [
      reg('2026-11-24', 9000, 30),
      { dia: '24/11/2026', pasos: 1, minutos: 1, conSensor: true },
      { dia: '2026-11-23', pasos: -5, minutos: 1, conSensor: true },
      { dia: '2026-11-22', pasos: 100, minutos: 'diez', conSensor: true },
      { dia: '2026-11-21', pasos: 100, minutos: 1 },
      null,
    ];
    expect(leerHistorialGuardado(datos)).toEqual([reg('2026-11-24', 9000, 30)]);
  });

  test('ordena, deja uno por día y se queda con los últimos 400', () => {
    const muchos = diasSeguidos(450, HOY).reverse();
    const leido = leerHistorialGuardado([...muchos, reg('2026-11-24', 1)]);
    expect(leido).toHaveLength(MAX_DIAS_HISTORIAL);
    expect(leido[0].pasos).toBe(50);
    expect(leido[leido.length - 1]).toEqual(reg('2026-11-24', 1));
  });
});

describe('actualizarHistorial', () => {
  test('agrega días cerrados pero nunca hoy', () => {
    const h = actualizarHistorial([], [reg('2026-11-24', 9000), reg('2026-11-25', 3000)], HOY);
    expect(h).toEqual([reg('2026-11-24', 9000)]);
  });

  test('un día con sensor es definitivo', () => {
    const inicial = [reg('2026-11-24', 9000, 30, true)];
    expect(actualizarHistorial(inicial, [reg('2026-11-24', 0, 0, true)], HOY)).toBe(inicial);
    expect(actualizarHistorial(inicial, [reg('2026-11-24', 500, 5, false)], HOY)).toBe(inicial);
  });

  test('un día sin sensor se corrige si aparece el sensor', () => {
    const h = actualizarHistorial([reg('2026-11-24', 500, 5, false)], [reg('2026-11-24', 9500, 35, true)], HOY);
    expect(h).toEqual([reg('2026-11-24', 9500, 35, true)]);
  });

  test('si no cambia nada devuelve el mismo arreglo', () => {
    const inicial = [reg('2026-11-24', 500, 5, false)];
    expect(actualizarHistorial(inicial, [reg('2026-11-24', 500, 5, false)], HOY)).toBe(inicial);
  });

  test('no pasa de 400 días', () => {
    const lleno = diasSeguidos(MAX_DIAS_HISTORIAL, new Date(2026, 10, 24));
    const h = actualizarHistorial(lleno, [reg('2026-11-24', 1)], HOY);
    expect(h).toHaveLength(MAX_DIAS_HISTORIAL);
    expect(h[h.length - 1].dia).toBe('2026-11-24');
    expect(h[0]).toEqual(lleno[1]);
  });
});

describe('totales en vivo y registros cerrados', () => {
  const pasosSensor = [
    { dia: new Date(2026, 10, 24), pasos: 9000 },
    { dia: new Date(2026, 10, 25), pasos: 4000 },
  ];
  const vivos = totalesVivos(pasosSensor, { '2026-11-24': 30, '2026-11-25': 10 }, [
    carga('2026-11-24', 500, 5),
    carga('2026-11-25', 800, 8),
  ]);

  test('sensor + manuales por día', () => {
    expect(vivos.get('2026-11-24')).toEqual({ pasos: 9500, minutos: 35 });
    expect(vivos.get('2026-11-25')).toEqual({ pasos: 4800, minutos: 18 });
  });

  test('registrosCerrados deja afuera hoy', () => {
    expect(registrosCerrados(vivos, HOY, true)).toEqual([reg('2026-11-24', 9500, 35, true)]);
  });
});

describe('crearTotalDelDia', () => {
  const vivos = new Map([
    ['2026-11-25', { pasos: 4800, minutos: 18 }],
    ['2026-11-24', { pasos: 500, minutos: 5 }], // sin sensor: sólo manuales
  ]);

  test('hoy sale de lo vivo', () => {
    const total = crearTotalDelDia(HOY, [reg('2026-11-25', 1, 1)], vivos);
    expect(total('2026-11-25')).toEqual({ pasos: 4800, minutos: 18 });
  });

  test('un día cerrado con sensor sale del historial aunque ahora no haya sensor', () => {
    const total = crearTotalDelDia(HOY, [reg('2026-11-24', 9500, 35, true)], vivos);
    expect(total('2026-11-24')).toMatchObject({ pasos: 9500, minutos: 35 });
  });

  test('un día viejo que sólo está en el historial', () => {
    const total = crearTotalDelDia(HOY, [reg('2026-10-01', 12000, 50)], vivos);
    expect(total('2026-10-01')).toMatchObject({ pasos: 12000, minutos: 50 });
    expect(total('2026-10-02')).toEqual({ pasos: 0, minutos: 0 });
  });
});

describe('serieDePasos y racha', () => {
  // 10 días seguidos con 10.500 pasos (del 15 al 24) y hoy en curso.
  const historial = diasSeguidos(10, HOY).map((r) => ({ ...r, pasos: 10500 }));
  const vivos = new Map([['2026-11-25', { pasos: 4000, minutos: 0 }]]);
  const total = crearTotalDelDia(HOY, historial, vivos);

  test('va desde el día más viejo del historial hasta hoy', () => {
    const serie = serieDePasos(HOY, historial, total);
    expect(serie).toHaveLength(11);
    expect(serie[serie.length - 1]).toBe(4000);
  });

  test('la racha puede pasar los 7 días', () => {
    expect(racha(serieDePasos(HOY, historial, total), 10000)).toBe(10);
  });

  test('un día sin datos corta la racha', () => {
    const conHueco = historial.filter((r) => r.dia !== '2026-11-20');
    const serie = serieDePasos(HOY, conHueco, crearTotalDelDia(HOY, conHueco, vivos));
    expect(racha(serie, 10000)).toBe(4);
  });

  test('sin historial, al menos los últimos 7 días', () => {
    expect(serieDePasos(HOY, [], total)).toHaveLength(7);
  });
});
