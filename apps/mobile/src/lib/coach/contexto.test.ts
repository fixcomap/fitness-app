import { ALIMENTOS_CASEROS } from '../comida/alimentos';
import type { RegistroComida } from '../comida/diario';
import type { Rutina } from '../entreno/rutinas';
import type { SesionGuardada } from '../entreno/tipos';
import type { PerfilUsuario } from '../perfil';
import pedidoEsperado from './__fixtures__/pedido-coach.json';
import { armarContexto, armarPedido, mensajesParaApi, type DatosCoach, type MensajeChat } from './contexto';

const empanada = ALIMENTOS_CASEROS.find((a) => a.id === 'casera:empanada-carne')!;
const perfil: PerfilUsuario = {
  nombre: 'Juan',
  sexo: 'hombre',
  edad: 24,
  alturaCm: 180,
  pesoKg: 78,
  objetivoPeso: 'bajar',
  objetivo: 'hipertrofia',
  diasEntrenoPorSemana: 3,
  kcalPersonalizadas: 1800,
  esPremium: false,
};
const registro = (id: string, dia: string, gramos: number): RegistroComida => ({
  id,
  dia,
  comida: 'almuerzo',
  alimento: empanada,
  cantidad: gramos ? { modo: 'gramos', gramos } : { modo: 'unidades', unidades: 2, porcion: 0 },
  creado: `${dia}T15:00:00.000Z`,
});
const sesion: SesionGuardada = {
  id: 's1',
  nombre: 'Full body A',
  inicio: new Date(2026, 10, 25, 19, 0).toISOString(),
  fin: new Date(2026, 10, 25, 20, 10).toISOString(),
  ejercicios: [
    { ejercicioId: 'sentadilla-barra', rango: { min: 6, max: 10 }, series: [], seriesTotales: 4 },
    { ejercicioId: 'press-banca-barra', rango: { min: 6, max: 10 }, series: [], seriesTotales: 4 },
  ],
  kcal: 410,
};
const rutina: Rutina = {
  id: 'rutina-1',
  nombre: 'Full body A',
  dias: [2, 4],
  ejercicios: [{ ejercicioId: 'sentadilla-barra', series: 4, rango: { min: 6, max: 10 } }],
};
const pasos: Record<string, number> = { '2026-11-25': 6000, '2026-11-26': 3000 };

// Jueves 26 de noviembre de 2026, 21:30 en hora local.
const datos: DatosCoach = {
  ahora: new Date(2026, 10, 26, 21, 30),
  perfil,
  diario: [registro('r1', '2026-11-26', 0), registro('r2', '2026-11-25', 150), registro('viejo', '2026-11-19', 100)],
  sesiones: [sesion],
  rutinas: [rutina],
  totalDelDia: (clave) => ({ pasos: pasos[clave] ?? 0, minutos: 0 }),
  metaPasos: 8000,
};
const usuario = (texto: string): MensajeChat => ({ rol: 'usuario', texto });
const coach = (texto: string): MensajeChat => ({ rol: 'coach', texto });

describe('mensajesParaApi', () => {
  test('manda solo los últimos 10 y arranca por uno del usuario', () => {
    // 11 mensajes alternados (u0, c1 … u10): los últimos 10 empiezan por c1, que se saca.
    const charla = Array.from({ length: 11 }, (_, i) => (i % 2 === 0 ? usuario(`u${i}`) : coach(`c${i}`)));
    const enviados = mensajesParaApi(charla);
    expect(enviados).toHaveLength(9);
    expect(enviados[0]).toEqual(usuario('u2'));
    expect(enviados.at(-1)).toEqual(usuario('u10'));
    // Si los últimos 10 ya empiezan por el usuario, van los 10.
    expect(mensajesParaApi(charla.slice(0, 10))).toEqual(charla.slice(0, 10));
  });

  test('recorta los textos al máximo de la API y saca los vacíos', () => {
    const largo = 'a'.repeat(4000);
    expect(mensajesParaApi([usuario('  hola  '), coach('   '), coach(largo)])).toEqual([
      usuario('hola'),
      coach('a'.repeat(2000)),
    ]);
  });

  test('sin mensajes del usuario no queda nada', () => {
    expect(mensajesParaApi([coach('¡Hola! Soy tu coach.')])).toEqual([]);
  });
});

describe('armarContexto', () => {
  const contexto = armarContexto(datos);

  test('hoy es la fecha local del celular', () => {
    expect(contexto.hoy).toBe('2026-11-26');
    // A las 23:59 sigue siendo el mismo día, sin importar la zona del servidor.
    expect(armarContexto({ ...datos, ahora: new Date(2026, 10, 26, 23, 59) }).hoy).toBe('2026-11-26');
  });

  test('los 7 días son hoy y los 6 anteriores, del más viejo al más nuevo', () => {
    expect(contexto.ultimos7Dias.map((d) => d.fecha)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
    ]);
  });

  test('cada día resume comidas, entrenos y actividad', () => {
    const hoy = contexto.ultimos7Dias[6];
    // 2 empanadas de 90 g a 333 kcal cada 100 g.
    expect(hoy).toMatchObject({ kcal: 599, comidas: ['Empanada de carne (2 empanadas)'], entrenos: [], pasos: 3000 });
    const ayer = contexto.ultimos7Dias[5];
    expect(ayer.comidas).toEqual(['Empanada de carne (150 g)']);
    expect(ayer.entrenos).toEqual([{ nombre: 'Full body A', ejercicios: 2, duracionMin: 70 }]);
    expect(ayer.pasos).toBe(6000);
    expect(ayer.kcalActividad).toBeGreaterThan(410); // caminata + entreno
    expect(contexto.ultimos7Dias[0]).toMatchObject({ kcal: 0, comidas: [], entrenos: [], pasos: 0, kcalActividad: 0 });
  });

  test('perfil con el objetivo de kcal que usa la app y rutinas con su id', () => {
    expect(contexto.perfil).toMatchObject({ nombre: 'Juan', objetivo: 'hipertrofia', kcalObjetivo: 1800 });
    expect(contexto.perfil).not.toHaveProperty('esPremium');
    expect(contexto.rutinas).toEqual([rutina]);
    expect(contexto).not.toHaveProperty('catalogo');
  });

  test('sin nombre no lo manda', () => {
    expect(armarContexto({ ...datos, perfil: { ...perfil, nombre: ' ' } }).perfil).not.toHaveProperty('nombre');
  });
});

describe('armarPedido', () => {
  test('null si el último mensaje no es del usuario', () => {
    expect(armarPedido([usuario('hola'), coach('¡Hola!')], datos)).toBeNull();
    expect(armarPedido([], datos)).toBeNull();
  });

  // La API valida este mismo archivo con su esquema (apps/api/test/pedidoApp.test.js).
  test('coincide con el pedido de ejemplo que valida la API', () => {
    expect(armarPedido([usuario('¿Cómo vengo esta semana?')], datos)).toEqual(pedidoEsperado);
  });
});
