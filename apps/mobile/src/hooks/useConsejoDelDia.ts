import { useEffect, useMemo, useRef, useState } from 'react';

import { useComidas } from '../estado/Comidas';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { guardarConsejosCoach, leerConsejosCoach, leerIdDispositivo } from '../lib/almacenamiento';
import { crearClienteApi } from '../lib/api';
import {
  agregarConsejo,
  armarPedidoConsejo,
  consejoDelDia,
  consejoLocal,
  type Consejo,
  type ConsejoGuardado,
} from '../lib/coach/consejo';
import { armarContexto } from '../lib/coach/contexto';
import { claveDia } from '../lib/pasosManuales';

// El consejo de la tarjeta "Tu coach": el de la IA, pedido la primera vez que se abre Inicio en el día y
// guardado con la fecha. Si no se puede pedir (sin internet, error o límite), uno simple armado en el celular,
// sin mostrar el error. Solo pide si el coach está habilitado (premium o desbloqueo de desarrollo).
// null mientras se piensa (o si el coach no está habilitado).
export function useConsejoDelDia(habilitado: boolean): { consejo: Consejo | null } {
  const { perfil, totalDelDia, config } = useDatosDelDia();
  const { metaPasos } = config;
  const { historial: sesiones, rutinas, listo: entrenoListo } = useEntreno();
  const { registros: diario, listo: comidasListas } = useComidas();

  const [guardados, setGuardados] = useState<ConsejoGuardado[] | null>(null); // null: todavía no se leyó
  const [fallo, setFallo] = useState<string | null>(null); // el día en que falló el pedido
  const pedidoDe = useRef<string | null>(null); // el día que ya se pidió: una vez por día

  const cliente = useMemo(() => crearClienteApi({ dispositivo: leerIdDispositivo }), []);
  const hoy = claveDia(new Date());

  // El contexto con lo último, para el pedido y para el consejo de repuesto.
  const contexto = useMemo(
    () => armarContexto({ ahora: new Date(), perfil, diario, sesiones, rutinas, totalDelDia, metaPasos }),
    [perfil, diario, sesiones, rutinas, totalDelDia, metaPasos],
  );
  const ultimoContexto = useRef(contexto);
  useEffect(() => {
    ultimoContexto.current = contexto;
  }, [contexto]);

  useEffect(() => {
    let vigente = true;
    leerConsejosCoach().then((leidos) => vigente && setGuardados(leidos));
    return () => {
      vigente = false;
    };
  }, []);

  // Se pide con los datos del día ya cargados, para que el consejo hable de lo real.
  const datosListos = guardados !== null && entrenoListo && comidasListas;
  const yaHayDeHoy = guardados !== null && consejoDelDia(guardados, hoy) !== null;

  useEffect(() => {
    if (!habilitado || !datosListos || yaHayDeHoy || pedidoDe.current === hoy) return;
    pedidoDe.current = hoy;
    const control = new AbortController();
    cliente
      .consejo(armarPedidoConsejo(ultimoContexto.current, guardados ?? [], new Date().getHours()), control.signal)
      .then((consejo) => {
        const nuevos = agregarConsejo(guardados ?? [], { ...consejo, fecha: hoy });
        setGuardados(nuevos);
        guardarConsejosCoach(nuevos).catch(() => {});
      })
      .catch(() => {
        if (!control.signal.aborted) setFallo(hoy);
      });
    return () => {
      // Si se va de Inicio a mitad del pedido, se vuelve a pedir la próxima vez.
      control.abort();
      pedidoDe.current = null;
    };
  }, [habilitado, datosListos, yaHayDeHoy, hoy, cliente, guardados]);

  const deHoy = guardados ? consejoDelDia(guardados, hoy) : null;
  if (deHoy) return { consejo: deHoy };
  if (fallo === hoy) return { consejo: consejoLocal(contexto, new Date().getHours()) };
  return { consejo: null };
}
