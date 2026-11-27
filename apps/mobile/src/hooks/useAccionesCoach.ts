import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useComidas } from '../estado/Comidas';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { leerPasos } from '../lib/actividad/consultas';
import {
  aplicarAccion,
  DESHACER_MS,
  deshacerPendiente,
  franjaCaminata,
  type AccionCoach,
  type ClaveEstado,
  type Deshacer,
  type EntornoAcciones,
  type EstadoApp,
  type ItemComida,
  type ProblemaAccion,
} from '../lib/coach/acciones';
import { alimentoParaAcciones, type BaseLocal } from '../lib/coach/alimentoDeAccion';
import { cambiarEstadoAccion, editarAccion, type AccionGuardada, type MensajeGuardado } from '../lib/coach/chat';
import { alimentosRecientes } from '../lib/comida/diario';
import type { Rutina } from '../lib/entreno/rutinas';
import { guardarRutina } from '../lib/entreno/rutinas';
import { accionDePasos, accionDeRutina, type ItemPropuesto, type PasosPropuestos } from '../lib/coach/editar';
import { crearCarga, type CargaPasos } from '../lib/pasosManuales';

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ActualizarChat = (cambio: (mensajes: MensajeGuardado[]) => MensajeGuardado[]) => void;

export interface AccionesCoach {
  estado: EstadoApp; // rutinas, diario y cargas como están ahora
  base: BaseLocal; // dónde se buscan los alimentos de registrar_comida
  perfil: EntornoAcciones['perfil'];
  // Lo último aplicado, mientras se puede deshacer (6 s): con el chat y el título de su tarjeta.
  pendiente: Pendiente | null;
  // null si se aplicó; si no, por qué no.
  // `alimentos`: en registrar_comida, los que se eligieron al editarla (uno por ítem, en orden).
  aplicar: (mensajeId: string, guardada: AccionGuardada, titulo: string, alimentos?: ItemPropuesto[]) => Promise<ProblemaAccion | null>;
  // Editadas en el editor de rutinas o en la hoja de pasos: al guardar quedan aplicadas.
  aplicarRutina: (mensajeId: string, guardada: AccionGuardada, titulo: string, rutina: Rutina) => boolean;
  aplicarPasos: (mensajeId: string, guardada: AccionGuardada, titulo: string, pasos: PasosPropuestos) => Promise<CargaPasos | null>;
  cancelar: (mensajeId: string, accionId: string) => void;
  editar: (mensajeId: string, accion: AccionCoach) => void;
  // Vuelve atrás lo último aplicado. false si ya pasaron los 6 s.
  deshacer: () => boolean;
}

export interface Pendiente {
  deshacer: Deshacer;
  mensajeId: string;
  titulo: string;
}

// Aplica las acciones del coach sobre lo guardado en el celu y deja el estado de cada una en el chat.
export function useAccionesCoach(actualizarChat: ActualizarChat): AccionesCoach {
  const { perfil, cargas, reemplazarCargas, fuente, estadoFuente } = useDatosDelDia();
  const { rutinas, reemplazarRutinas } = useEntreno();
  const { registros, propios, reemplazarRegistros } = useComidas();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const estado = useMemo<EstadoApp>(() => ({ rutinas, diario: registros, cargas }), [rutinas, registros, cargas]);
  const base = useMemo<BaseLocal>(() => ({ recientes: alimentosRecientes(registros), propios }), [registros, propios]);

  // Lo último (aplicar espera a leer el podómetro) y las que se están aplicando o ya se aplicaron en esta
  // sesión: contra el doble toque, antes de que el chat guarde "aplicada".
  const actual = useRef({ estado, base, pendiente });
  useEffect(() => {
    actual.current = { estado, base, pendiente };
  }, [estado, base, pendiente]);
  const aplicando = useRef(new Set<string>());

  // Escribe en el estado de la app solo la clave que tocó la acción.
  const guardarClave = useCallback(
    (clave: ClaveEstado, nuevo: EstadoApp) => {
      if (clave === 'rutinas') reemplazarRutinas(nuevo.rutinas);
      else if (clave === 'diario') reemplazarRegistros(nuevo.diario);
      else reemplazarCargas(nuevo.cargas);
    },
    [reemplazarRutinas, reemplazarRegistros, reemplazarCargas],
  );

  // A los 6 s el deshacer vence y el aviso se va.
  useEffect(() => {
    if (!pendiente) return;
    const espera = setTimeout(() => setPendiente((p) => (p === pendiente ? null : p)), Math.max(0, pendiente.deshacer.vence - Date.now()));
    return () => clearTimeout(espera);
  }, [pendiente]);

  const aplicar = useCallback(
    async (mensajeId: string, { accion, estado: estadoAccion }: AccionGuardada, titulo: string, alimentos?: ItemPropuesto[]) => {
      if (estadoAccion !== 'pendiente' || aplicando.current.has(accion.id)) return null;
      aplicando.current.add(accion.id);
      let aplicada = false;
      try {
        // Los pasos que el celu ya contó en esa franja, para no contarlos dos veces.
        let registrado = 0;
        if (accion.tipo === 'cargar_pasos' && estadoFuente === 'activa') {
          const franja = franjaCaminata(accion, { ahora: new Date(), perfil });
          registrado = (await leerPasos(fuente, franja.inicio, franja.fin)) ?? 0;
        }
        const { estado: ahoraEstado, base: ahoraBase, pendiente: anterior } = actual.current;
        const r = aplicarAccion({ estado: ahoraEstado, pendiente: anterior?.deshacer ?? null }, accion, {
          ahora: new Date(),
          perfil,
          crearId: nuevoId,
          alimentoPara: alimentoParaEditados(accion, alimentos) ?? alimentoParaAcciones(ahoraBase),
          pasosRegistrados: () => registrado,
        });
        if (!r.ok) return r.problema;
        const { estado: nuevo, pendiente: deshacer } = r.siguiente;
        if (!deshacer) return null;
        guardarClave(deshacer.clave, nuevo);
        aplicada = true;
        setPendiente({ deshacer, mensajeId, titulo });
        actualizarChat((h) => cambiarEstadoAccion(h, mensajeId, accion.id, 'aplicada') ?? h);
        return null;
      } finally {
        if (!aplicada) aplicando.current.delete(accion.id);
      }
    },
    [estadoFuente, fuente, perfil, guardarClave, actualizarChat],
  );

  const cancelar = useCallback(
    (mensajeId: string, accionId: string) => actualizarChat((h) => cambiarEstadoAccion(h, mensajeId, accionId, 'cancelada') ?? h),
    [actualizarChat],
  );

  const editar = useCallback(
    (mensajeId: string, accion: AccionCoach) => actualizarChat((h) => editarAccion(h, mensajeId, accion) ?? h),
    [actualizarChat],
  );

  // Guarda lo editado en una clave como si fuera una acción aplicada: con su deshacer y "aplicada" en el chat.
  const aplicarEditada = useCallback(
    <C extends ClaveEstado>(mensajeId: string, guardada: AccionGuardada, titulo: string, editada: AccionCoach, clave: C, valor: EstadoApp[C]) => {
      const id = guardada.accion.id;
      if (guardada.estado !== 'pendiente' || aplicando.current.has(id)) return false;
      aplicando.current.add(id);
      const { estado: ahoraEstado } = actual.current;
      const deshacer = { accionId: id, clave, anterior: ahoraEstado[clave], vence: Date.now() + DESHACER_MS } as Deshacer;
      guardarClave(clave, { ...ahoraEstado, [clave]: valor });
      setPendiente({ deshacer, mensajeId, titulo });
      actualizarChat((h) => cambiarEstadoAccion(h, mensajeId, id, 'aplicada', editada) ?? h);
      return true;
    },
    [guardarClave, actualizarChat],
  );

  const aplicarRutina = useCallback(
    (mensajeId: string, guardada: AccionGuardada, titulo: string, rutina: Rutina) =>
      aplicarEditada(mensajeId, guardada, titulo, accionDeRutina(guardada.accion, rutina), 'rutinas', guardarRutina(actual.current.estado.rutinas, rutina)),
    [aplicarEditada],
  );

  const aplicarPasos = useCallback(
    async (mensajeId: string, guardada: AccionGuardada, titulo: string, pasos: PasosPropuestos) => {
      if (guardada.accion.tipo !== 'cargar_pasos') return null;
      const registrado = estadoFuente === 'activa' ? ((await leerPasos(fuente, pasos.franja.inicio, pasos.franja.fin)) ?? 0) : 0;
      const carga = crearCarga({ ...pasos, registrado }, perfil, nuevoId());
      const editada = accionDePasos(guardada.accion, pasos);
      return aplicarEditada(mensajeId, guardada, titulo, editada, 'cargas', [...actual.current.estado.cargas, carga]) ? carga : null;
    },
    [estadoFuente, fuente, perfil, aplicarEditada],
  );

  const deshacer = useCallback(() => {
    const { estado: ahoraEstado, pendiente: p } = actual.current;
    if (!p) return false;
    const r = deshacerPendiente({ estado: ahoraEstado, pendiente: p.deshacer }, new Date());
    if (!r) return false;
    guardarClave(p.deshacer.clave, r.estado);
    setPendiente(null);
    // La acción vuelve a quedar pendiente: se puede aplicar otra vez.
    aplicando.current.delete(p.deshacer.accionId);
    actualizarChat((h) => cambiarEstadoAccion(h, p.mensajeId, p.deshacer.accionId, 'pendiente') ?? h);
    return true;
  }, [guardarClave, actualizarChat]);

  return { estado, base, perfil, pendiente, aplicar, aplicarRutina, aplicarPasos, cancelar, editar, deshacer };
}

// Con la comida editada: cada ítem de la acción va con el alimento y la cantidad que se eligieron.
function alimentoParaEditados(accion: AccionCoach, alimentos: ItemPropuesto[] | undefined): EntornoAcciones['alimentoPara'] | null {
  if (accion.tipo !== 'registrar_comida' || !alimentos || alimentos.length !== accion.items.length) return null;
  const porItem = new Map<ItemComida, ItemPropuesto>(accion.items.map((item, i) => [item, alimentos[i]]));
  return (item) => porItem.get(item) ?? alimentos[0];
}
