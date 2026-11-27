import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useComidas } from '../estado/Comidas';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { leerPasos } from '../lib/actividad/consultas';
import {
  aplicarAccion,
  franjaCaminata,
  type AccionCoach,
  type Deshacer,
  type EntornoAcciones,
  type EstadoApp,
  type ProblemaAccion,
} from '../lib/coach/acciones';
import { alimentoParaAcciones, type BaseLocal } from '../lib/coach/alimentoDeAccion';
import { cambiarEstadoAccion, editarAccion, type AccionGuardada, type MensajeGuardado } from '../lib/coach/chat';
import { alimentosRecientes } from '../lib/comida/diario';

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ActualizarChat = (cambio: (mensajes: MensajeGuardado[]) => MensajeGuardado[]) => void;

export interface AccionesCoach {
  estado: EstadoApp; // rutinas, diario y cargas como están ahora
  base: BaseLocal; // dónde se buscan los alimentos de registrar_comida
  perfil: EntornoAcciones['perfil'];
  pendiente: Deshacer | null; // lo último aplicado, para deshacer
  // null si se aplicó; si no, por qué no.
  aplicar: (mensajeId: string, guardada: AccionGuardada) => Promise<ProblemaAccion | null>;
  cancelar: (mensajeId: string, accionId: string) => void;
  editar: (mensajeId: string, accion: AccionCoach) => void;
}

// Aplica las acciones del coach sobre lo guardado en el celu y deja el estado de cada una en el chat.
export function useAccionesCoach(actualizarChat: ActualizarChat): AccionesCoach {
  const { perfil, cargas, reemplazarCargas, fuente, estadoFuente } = useDatosDelDia();
  const { rutinas, reemplazarRutinas } = useEntreno();
  const { registros, propios, reemplazarRegistros } = useComidas();
  const [pendiente, setPendiente] = useState<Deshacer | null>(null);

  const estado = useMemo<EstadoApp>(() => ({ rutinas, diario: registros, cargas }), [rutinas, registros, cargas]);
  const base = useMemo<BaseLocal>(() => ({ recientes: alimentosRecientes(registros), propios }), [registros, propios]);

  // Lo último (aplicar espera a leer el podómetro) y las que se están aplicando o ya se aplicaron en esta
  // sesión: contra el doble toque, antes de que el chat guarde "aplicada".
  const actual = useRef({ estado, base, pendiente });
  useEffect(() => {
    actual.current = { estado, base, pendiente };
  }, [estado, base, pendiente]);
  const aplicando = useRef(new Set<string>());

  const aplicar = useCallback(
    async (mensajeId: string, { accion, estado: estadoAccion }: AccionGuardada) => {
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
        const r = aplicarAccion({ estado: ahoraEstado, pendiente: anterior }, accion, {
          ahora: new Date(),
          perfil,
          crearId: nuevoId,
          alimentoPara: alimentoParaAcciones(ahoraBase),
          pasosRegistrados: () => registrado,
        });
        if (!r.ok) return r.problema;
        const { estado: nuevo, pendiente: deshacer } = r.siguiente;
        if (deshacer?.clave === 'rutinas') reemplazarRutinas(nuevo.rutinas);
        else if (deshacer?.clave === 'diario') reemplazarRegistros(nuevo.diario);
        else if (deshacer?.clave === 'cargas') reemplazarCargas(nuevo.cargas);
        aplicada = true;
        setPendiente(deshacer);
        actualizarChat((h) => cambiarEstadoAccion(h, mensajeId, accion.id, 'aplicada') ?? h);
        return null;
      } finally {
        if (!aplicada) aplicando.current.delete(accion.id);
      }
    },
    [estadoFuente, fuente, perfil, reemplazarRutinas, reemplazarRegistros, reemplazarCargas, actualizarChat],
  );

  const cancelar = useCallback(
    (mensajeId: string, accionId: string) => actualizarChat((h) => cambiarEstadoAccion(h, mensajeId, accionId, 'cancelada') ?? h),
    [actualizarChat],
  );

  const editar = useCallback(
    (mensajeId: string, accion: AccionCoach) => actualizarChat((h) => editarAccion(h, mensajeId, accion) ?? h),
    [actualizarChat],
  );

  return { estado, base, perfil, pendiente, aplicar, cancelar, editar };
}
