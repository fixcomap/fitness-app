// Perfil del usuario guardado en el celu. Mientras no haya uno, la app muestra el
// onboarding (ver App.tsx).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { guardarPerfil, leerPerfil } from '../lib/almacenamiento';
import type { PerfilUsuario } from '../lib/perfil';

export interface PerfilValor {
  listo: boolean; // ya se leyó lo guardado
  perfil: PerfilUsuario | null; // null: primera vez
  guardar: (perfil: PerfilUsuario) => void;
}

const Contexto = createContext<PerfilValor | null>(null);

export function ProveedorPerfil({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerPerfil().then((leido) => {
      if (!vigente) return;
      setPerfil(leido);
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const guardar = useCallback((nuevo: PerfilUsuario) => {
    setPerfil(nuevo);
    guardarPerfil(nuevo).catch(() => {});
  }, []);

  const valor = useMemo(() => ({ listo, perfil, guardar }), [listo, perfil, guardar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePerfil(): PerfilValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('usePerfil tiene que usarse dentro de ProveedorPerfil');
  return valor;
}

// El perfil ya cargado: sólo en las pantallas que se muestran después del onboarding.
export function usePerfilActual(): PerfilUsuario {
  const { perfil } = usePerfil();
  if (!perfil) throw new Error('Todavía no hay perfil: se usa después del onboarding');
  return perfil;
}
