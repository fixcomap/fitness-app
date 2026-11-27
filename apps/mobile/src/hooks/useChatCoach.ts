import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useComidas } from '../estado/Comidas';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { guardarChatCoach, leerChatCoach, leerIdDispositivo } from '../lib/almacenamiento';
import { crearClienteApi } from '../lib/api';
import {
  agregarMensajes,
  caducarViejas,
  errorDeChat,
  mensajeCoach,
  mensajeUsuario,
  type ErrorChat,
  type MensajeGuardado,
} from '../lib/coach/chat';
import { armarPedido } from '../lib/coach/contexto';
import { mensajesConPropuestas } from '../lib/coach/propuestas';

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface ChatCoach {
  listo: boolean;
  mensajes: MensajeGuardado[]; // del más viejo al más nuevo
  enviando: boolean;
  error: ErrorChat | null;
  enviar: (texto: string) => void;
  reintentar: () => void;
  // Para que las tarjetas guarden el estado de sus acciones (ver cambiarEstadoAccion).
  actualizar: (cambio: (mensajes: MensajeGuardado[]) => MensajeGuardado[]) => void;
}

// La charla con el coach: guardada en el celu, y cada mensaje se manda a /coach con el contexto del día.
export function useChatCoach(): ChatCoach {
  const { perfil, totalDelDia, config } = useDatosDelDia();
  const { metaPasos } = config;
  const { historial: sesiones, rutinas } = useEntreno();
  const { registros: diario } = useComidas();

  const [mensajes, setMensajes] = useState<MensajeGuardado[]>([]);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorChat | null>(null);
  // Lo último, para mandar sin esperar a que se vuelva a dibujar; y un candado contra el doble toque.
  const actuales = useRef(mensajes);
  const ocupado = useRef(false);
  const control = useRef<AbortController | null>(null);

  const cliente = useMemo(() => crearClienteApi({ dispositivo: leerIdDispositivo }), []);
  const datos = useRef({ perfil, totalDelDia, metaPasos, sesiones, rutinas, diario });
  useEffect(() => {
    actuales.current = mensajes;
  }, [mensajes]);
  useEffect(() => {
    datos.current = { perfil, totalDelDia, metaPasos, sesiones, rutinas, diario };
  }, [perfil, totalDelDia, metaPasos, sesiones, rutinas, diario]);

  useEffect(() => {
    let vigente = true;
    leerChatCoach().then((leidos) => {
      if (!vigente) return;
      setMensajes(caducarViejas(leidos, new Date()));
      setListo(true);
    });
    return () => {
      vigente = false;
      control.current?.abort();
    };
  }, []);

  // Se guarda cada cambio, pero no antes de haber leído (si no, pisaría lo guardado).
  useEffect(() => {
    if (listo) guardarChatCoach(mensajes).catch(() => {});
  }, [mensajes, listo]);

  const pedir = useCallback(
    async (historial: MensajeGuardado[]) => {
      const ahora = new Date();
      // Los mensajes del coach van con el resumen de lo que propuso, para que no lo vuelva a armar.
      const pedido = armarPedido(mensajesConPropuestas(historial, datos.current.rutinas), { ahora, ...datos.current });
      if (!pedido || ocupado.current) return;
      ocupado.current = true;
      setEnviando(true);
      setError(null);
      const esta = new AbortController();
      control.current = esta;
      try {
        const respuesta = await cliente.coach(pedido, esta.signal);
        setMensajes((m) => agregarMensajes(caducarViejas(m, new Date()), [mensajeCoach(respuesta, new Date(), nuevoId())]));
      } catch (e) {
        if (!esta.signal.aborted) setError(errorDeChat(e));
      } finally {
        ocupado.current = false;
        setEnviando(false);
      }
    },
    [cliente],
  );

  const enviar = useCallback(
    (texto: string) => {
      if (ocupado.current || !texto.trim()) return;
      const historial = agregarMensajes(actuales.current, [mensajeUsuario(texto, new Date(), nuevoId())]);
      actuales.current = historial;
      setMensajes(historial);
      pedir(historial);
    },
    [pedir],
  );

  const reintentar = useCallback(() => {
    pedir(actuales.current);
  }, [pedir]);

  const actualizar = useCallback((cambio: (m: MensajeGuardado[]) => MensajeGuardado[]) => setMensajes(cambio), []);

  return { listo, mensajes, enviando, error, enviar, reintentar, actualizar };
}
