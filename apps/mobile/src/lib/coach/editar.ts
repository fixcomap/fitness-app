// Editar una acción del coach en las pantallas de la app (rutina, porción, pasos) antes de aplicarla:
// lo que se precarga en cada una. Funciones puras.
import type { Alimento } from '../comida/alimentos';
import type { Cantidad } from '../comida/porciones';
import { agregarEjercicios, type Rutina } from '../entreno/rutinas';
import { claveDia, horaMinutos, type Franja, type TipoCarga } from '../pasosManuales';
import { franjaCaminata, type AccionCoach, type AccionDe, type EntornoAcciones } from './acciones';
import { buscarAlimentoDeItem, type BaseLocal } from './alimentoDeAccion';

// Qué pantalla abre Editar, o null si esa acción no se edita (borrar rutinas no tiene nada para cambiar;
// los pasos de otro día tampoco: la hoja de pasos carga solo en el día de hoy).
export type Editor = 'rutina' | 'comida' | 'pasos';

export function editorDe(accion: AccionCoach, ahora: Date): Editor | null {
  switch (accion.tipo) {
    case 'crear_rutina':
    case 'agregar_ejercicios':
    case 'quitar_ejercicios':
      return 'rutina';
    case 'registrar_comida':
      return 'comida';
    case 'cargar_pasos':
      return accion.dia === claveDia(ahora) ? 'pasos' : null;
    case 'borrar_rutinas':
      return null;
  }
}

// La rutina como quedaría con la acción, para abrirla en el editor. null si ya no se puede.
export function rutinaPropuesta(accion: AccionCoach, rutinas: readonly Rutina[], crearId: () => string): Rutina | null {
  switch (accion.tipo) {
    case 'crear_rutina':
      return {
        id: crearId(),
        nombre: accion.nombre,
        dias: accion.dia === null ? [] : [accion.dia],
        ejercicios: accion.ejercicios.map((e) => ({ ...e, rango: { ...e.rango } })),
      };
    case 'agregar_ejercicios': {
      const rutina = rutinas.find((r) => r.id === accion.rutinaId);
      return rutina ? agregarEjercicios(rutina, accion.ejercicios) : null;
    }
    case 'quitar_ejercicios': {
      const rutina = rutinas.find((r) => r.id === accion.rutinaId);
      if (!rutina) return null;
      const ejercicios = rutina.ejercicios.filter((e) => !accion.ejercicioIds.includes(e.ejercicioId));
      return ejercicios.length > 0 ? { ...rutina, ejercicios } : null;
    }
    default:
      return null;
  }
}

export interface ItemPropuesto {
  alimento: Alimento;
  cantidad: Cantidad;
}

// Cada ítem con el alimento que se va a cargar y su cantidad, para la hoja de porciones.
export function itemsPropuestos(accion: AccionDe<'registrar_comida'>, base: BaseLocal): ItemPropuesto[] {
  return accion.items.map((item) => {
    const { alimento, cantidad } = buscarAlimentoDeItem(item, base);
    return { alimento, cantidad };
  });
}

export interface PasosPropuestos {
  tipo: TipoCarga;
  valor: number;
  franja: Franja;
}

// Lo que se precarga en la hoja de pasos: la unidad, el valor y la franja de la caminata.
export function pasosPropuestos(accion: AccionDe<'cargar_pasos'>, entorno: Pick<EntornoAcciones, 'ahora' | 'perfil'>): PasosPropuestos {
  return { tipo: accion.unidad, valor: accion.valor, franja: franjaCaminata(accion, entorno) };
}

// La acción como quedó después de editarla en la hoja de pasos (para el historial del chat).
export function accionDePasos(accion: AccionDe<'cargar_pasos'>, { tipo, valor, franja }: PasosPropuestos): AccionDe<'cargar_pasos'> {
  return { ...accion, dia: claveDia(franja.fin), unidad: tipo, valor, hora: horaMinutos(franja.fin) };
}

// La acción de rutina como quedó en el editor: crear_rutina guarda el nombre, el día y los ejercicios
// elegidos; agregar y quitar quedan como estaban (el resultado está en las rutinas).
export function accionDeRutina(accion: AccionCoach, rutina: Rutina): AccionCoach {
  if (accion.tipo !== 'crear_rutina') return accion;
  return {
    ...accion,
    nombre: rutina.nombre.trim(),
    dia: rutina.dias[0] ?? null,
    ejercicios: rutina.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, series: e.series, rango: { ...e.rango } })),
  };
}
