import type { Ejercicio } from '../data/tipos';
import {
  agruparPorGrupo,
  filtrarEjercicios,
  filtrarPorEquipo,
  filtrarPorMusculo,
  filtrarPorTexto,
  FILTROS_VACIOS,
  hayFiltrosActivos,
  normalizar,
  ordenarGruposPorMusculo,
  trabajaComoSecundario,
} from './filtrosEjercicios';

function ejercicio(parcial: Partial<Ejercicio> & Pick<Ejercicio, 'id'>): Ejercicio {
  return {
    nombre: parcial.id,
    grupo: 'pecho',
    equipo: 'peso-corporal',
    nivel: 'principiante',
    musculoPrincipal: 'chest',
    musculosSecundarios: [],
    tecnica: ['paso'],
    erroresComunes: ['error'],
    youtubeId: '',
    ...parcial,
  };
}

const flexiones = ejercicio({ id: 'flexiones', nombre: 'Flexiones de brazos', musculosSecundarios: ['triceps', 'deltoids'] });
const press = ejercicio({ id: 'press', nombre: 'Press militar', grupo: 'hombros', equipo: 'mancuernas', musculoPrincipal: 'deltoids' });
const curl = ejercicio({ id: 'curl', nombre: 'Curl de bíceps', grupo: 'brazos', equipo: 'barra', musculoPrincipal: 'biceps' });
const hip = ejercicio({ id: 'hip', nombre: 'Hip thrust', grupo: 'gluteos', equipo: 'barra', musculoPrincipal: 'gluteal' });
const TODOS = [flexiones, press, curl, hip];

describe('normalizar', () => {
  test('saca tildes, mayúsculas y espacios de más', () => {
    expect(normalizar('  Glúteos   Y  BÍCEPS ')).toBe('gluteos y biceps');
  });
});

describe('filtrarPorTexto', () => {
  test('sin texto devuelve todo', () => {
    expect(filtrarPorTexto(TODOS, '   ')).toEqual(TODOS);
  });

  test('busca en el nombre sin importar tildes ni mayúsculas', () => {
    expect(filtrarPorTexto(TODOS, 'BICEPS')).toEqual([curl]);
  });

  test('busca por grupo y por músculo principal', () => {
    expect(filtrarPorTexto(TODOS, 'glúteos')).toEqual([hip]);
    expect(filtrarPorTexto(TODOS, 'hombros')).toEqual([press]);
  });

  test('todas las palabras tienen que aparecer', () => {
    expect(filtrarPorTexto(TODOS, 'press hombros')).toEqual([press]);
    expect(filtrarPorTexto(TODOS, 'press piernas')).toEqual([]);
  });
});

describe('filtrarPorEquipo', () => {
  test('"todos" no filtra', () => {
    expect(filtrarPorEquipo(TODOS, 'todos')).toEqual(TODOS);
  });

  test('filtra por el equipo elegido', () => {
    expect(filtrarPorEquipo(TODOS, 'barra')).toEqual([curl, hip]);
    expect(filtrarPorEquipo(TODOS, 'bandas')).toEqual([]);
  });
});

describe('filtrarPorMusculo', () => {
  test('null no filtra', () => {
    expect(filtrarPorMusculo(TODOS, null)).toEqual(TODOS);
  });

  test('incluye ejercicios con el músculo como principal o secundario', () => {
    expect(filtrarPorMusculo(TODOS, 'triceps')).toEqual([flexiones]);
    expect(filtrarPorMusculo(TODOS, 'abs')).toEqual([]);
  });

  test('primero los principales y después los secundarios', () => {
    // flexiones (secundario) está antes que press (principal) en la lista original
    expect(filtrarPorMusculo(TODOS, 'deltoids')).toEqual([press, flexiones]);
  });

  test('mantiene el orden original dentro de cada parte', () => {
    const otroPress = ejercicio({ id: 'otro-press', grupo: 'hombros', musculoPrincipal: 'deltoids' });
    const plancha = ejercicio({ id: 'plancha', grupo: 'abdomen', musculoPrincipal: 'abs', musculosSecundarios: ['deltoids'] });
    expect(filtrarPorMusculo([plancha, press, flexiones, otroPress], 'deltoids')).toEqual([
      press,
      otroPress,
      plancha,
      flexiones,
    ]);
  });
});

describe('trabajaComoSecundario', () => {
  test('es true sólo si el músculo es secundario', () => {
    expect(trabajaComoSecundario(flexiones, 'triceps')).toBe(true);
    expect(trabajaComoSecundario(flexiones, 'chest')).toBe(false);
    expect(trabajaComoSecundario(flexiones, 'abs')).toBe(false);
  });
});

describe('filtrarEjercicios', () => {
  test('combina texto, equipo y músculo', () => {
    expect(filtrarEjercicios(TODOS, { texto: '', equipo: 'mancuernas', musculo: 'deltoids' })).toEqual([press]);
    expect(filtrarEjercicios(TODOS, { texto: 'flex', equipo: 'barra', musculo: null })).toEqual([]);
  });

  test('sin filtros devuelve todo', () => {
    expect(filtrarEjercicios(TODOS, FILTROS_VACIOS)).toEqual(TODOS);
  });
});

describe('agruparPorGrupo', () => {
  test('respeta el orden de los grupos y omite los vacíos', () => {
    expect(agruparPorGrupo(TODOS).map((g) => [g.grupo, g.ejercicios.length])).toEqual([
      ['hombros', 1],
      ['pecho', 1],
      ['brazos', 1],
      ['gluteos', 1],
    ]);
  });
});

describe('ordenarGruposPorMusculo', () => {
  test('sin músculo no cambia el orden', () => {
    const grupos = agruparPorGrupo(TODOS);
    expect(ordenarGruposPorMusculo(grupos, null)).toEqual(grupos);
  });

  test('pone primero los grupos donde el músculo es principal', () => {
    const plancha = ejercicio({ id: 'plancha', grupo: 'abdomen', musculoPrincipal: 'abs' });
    const conAbs = ejercicio({ id: 'con-abs', grupo: 'pecho', musculosSecundarios: ['abs'] });
    const grupos = agruparPorGrupo(filtrarPorMusculo([plancha, conAbs], 'abs'));
    // en el orden fijo, pecho va antes que abdomen
    expect(grupos.map((g) => g.grupo)).toEqual(['pecho', 'abdomen']);
    expect(ordenarGruposPorMusculo(grupos, 'abs').map((g) => g.grupo)).toEqual(['abdomen', 'pecho']);
  });
});

describe('hayFiltrosActivos', () => {
  test('detecta cualquier filtro', () => {
    expect(hayFiltrosActivos(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, texto: '  ' })).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, texto: 'a' })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, equipo: 'barra' })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, musculo: 'abs' })).toBe(true);
  });
});
