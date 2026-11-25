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
    expect(filtrarPorMusculo(TODOS, 'deltoids')).toEqual([flexiones, press]);
    expect(filtrarPorMusculo(TODOS, 'triceps')).toEqual([flexiones]);
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

describe('hayFiltrosActivos', () => {
  test('detecta cualquier filtro', () => {
    expect(hayFiltrosActivos(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, texto: '  ' })).toBe(false);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, texto: 'a' })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, equipo: 'barra' })).toBe(true);
    expect(hayFiltrosActivos({ ...FILTROS_VACIOS, musculo: 'abs' })).toBe(true);
  });
});
