import { useState } from 'react';
import { Modal } from 'react-native';

import { useDatosDelDia } from '../../estado/DatosDelDia';
import type { AccionesCoach } from '../../hooks/useAccionesCoach';
import type { AccionGuardada } from '../../lib/coach/chat';
import { itemsPropuestos, pasosPropuestos, rutinaPropuesta, type ItemPropuesto, type PasosPropuestos } from '../../lib/coach/editar';
import type { Rutina } from '../../lib/entreno/rutinas';
import { useNavegacionRaiz } from '../../navigation/tiposRaiz';
import { EditarRutinaScreen } from '../../screens/EditarRutinaScreen';
import { HojaPasosManuales } from '../inicio/HojaPasosManuales';
import { HojaEditarComida } from './HojaEditarComida';

const nuevoId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Lo que se está editando: la acción y lo que se precargó en su pantalla.
export type Edicion = { mensajeId: string; guardada: AccionGuardada; titulo: string } & (
  | { editor: 'rutina'; rutina: Rutina }
  | { editor: 'comida'; items: ItemPropuesto[] }
  | { editor: 'pasos'; pasos: PasosPropuestos }
);

// La edición para abrir, o null si esa acción ya no se puede preparar (por ejemplo, la rutina no existe).
export function prepararEdicion(
  mensajeId: string,
  guardada: AccionGuardada,
  titulo: string,
  editor: 'rutina' | 'comida' | 'pasos',
  acciones: AccionesCoach,
): Edicion | null {
  const { accion } = guardada;
  const base = { mensajeId, guardada, titulo };
  if (editor === 'rutina') {
    const rutina = rutinaPropuesta(accion, acciones.estado.rutinas, nuevoId);
    return rutina ? { ...base, editor, rutina } : null;
  }
  if (editor === 'comida' && accion.tipo === 'registrar_comida') {
    return { ...base, editor, items: itemsPropuestos(accion, acciones.base) };
  }
  if (editor === 'pasos' && accion.tipo === 'cargar_pasos') {
    return { ...base, editor, pasos: pasosPropuestos(accion, { ahora: new Date(), perfil: acciones.perfil }) };
  }
  return null;
}

interface EditorAccionProps {
  edicion: Edicion | null;
  acciones: AccionesCoach;
  onCerrar: () => void;
}

// Abre la acción en la pantalla de la app que corresponde, con la propuesta precargada.
// Al guardar, queda aplicada (con su Deshacer).
export function EditorAccion({ edicion, acciones, onCerrar }: EditorAccionProps) {
  const { perfil, cargasDeHoy, borrar, config, estadoFuente } = useDatosDelDia();
  const raiz = useNavegacionRaiz();
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const aplicarComida = async (items: ItemPropuesto[]) => {
    if (!edicion) return;
    const problema = await acciones.aplicar(edicion.mensajeId, edicion.guardada, edicion.titulo, items);
    if (problema) setError(problema.mensaje);
    else cerrar();
  };

  return (
    <>
      <Modal
        visible={edicion?.editor === 'rutina'}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={cerrar}
      >
        {edicion?.editor === 'rutina' && (
          <EditarRutinaScreen
            propuesta={{
              rutina: edicion.rutina,
              onGuardar: (rutina) => acciones.aplicarRutina(edicion.mensajeId, edicion.guardada, edicion.titulo, rutina),
            }}
            onCerrar={cerrar}
          />
        )}
      </Modal>

      <HojaEditarComida
        abierta={edicion?.editor === 'comida' ? { titulo: edicion.titulo, items: edicion.items } : null}
        error={error}
        onAplicar={aplicarComida}
        onCerrar={cerrar}
      />

      <HojaPasosManuales
        visible={edicion?.editor === 'pasos'}
        inicial={edicion?.editor === 'pasos' ? edicion.pasos : undefined}
        onCerrar={cerrar}
        perfil={perfil}
        cargasDeHoy={cargasDeHoy}
        onAgregar={async (tipo, valor, franja) =>
          edicion ? acciones.aplicarPasos(edicion.mensajeId, edicion.guardada, edicion.titulo, { tipo, valor, franja }) : null
        }
        conPodometro={estadoFuente === 'activa'}
        onBorrar={borrar}
        metaPasos={config.metaPasos}
        onAbrirPerfil={() => raiz.navigate('Perfil')}
      />
    </>
  );
}
