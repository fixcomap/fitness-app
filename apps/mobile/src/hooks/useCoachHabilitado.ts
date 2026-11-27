import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { usePerfilActual } from '../estado/Perfil';
import { guardarDesbloqueoDev, leerDesbloqueoDev } from '../lib/almacenamiento';
import { coachHabilitado } from '../lib/coach/chat';

// El desbloqueo de desarrollo, compartido por la pestaña (el candado) y la pantalla del coach.
// En un build de producción no se lee ni se guarda nada, y coachHabilitado lo ignora.
let desbloqueado = false;
let leido = false;
const oyentes = new Set<() => void>();

function cambiar(valor: boolean) {
  desbloqueado = valor;
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function useCoachHabilitado(): { habilitado: boolean; desbloquearDev: (() => void) | null } {
  const { esPremium } = usePerfilActual();
  const desbloqueoDev = useSyncExternalStore(suscribir, () => desbloqueado);

  useEffect(() => {
    if (!__DEV__ || leido) return;
    leido = true;
    leerDesbloqueoDev().then((v) => v && cambiar(true));
  }, []);

  const desbloquear = useCallback(() => {
    cambiar(true);
    guardarDesbloqueoDev(true).catch(() => {});
  }, []);

  return { habilitado: coachHabilitado(esPremium, desbloqueoDev), desbloquearDev: __DEV__ ? desbloquear : null };
}
