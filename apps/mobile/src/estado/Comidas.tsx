// Diario de comidas y productos envasados ya usados, guardados en el celu.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { guardarDiarioComidas, guardarProductosOff, leerDiarioComidas, leerProductosOff } from '../lib/almacenamiento';
import type { Alimento } from '../lib/comida/alimentos';
import {
  agregarRegistro,
  borrarRegistro,
  editarRegistro,
  nuevoRegistro,
  type Comida,
  type RegistroComida,
} from '../lib/comida/diario';
import { recordarProducto } from '../lib/comida/openFoodFacts';
import type { Cantidad } from '../lib/comida/porciones';
import { claveDia } from '../lib/pasosManuales';

export interface ComidasValor {
  listo: boolean;
  registros: RegistroComida[];
  productos: Alimento[]; // envasados ya usados, el último primero
  agregar: (dia: string, comida: Comida, alimento: Alimento, cantidad: Cantidad) => void;
  editar: (id: string, cambios: Partial<Pick<RegistroComida, 'cantidad' | 'comida'>>) => void;
  borrar: (id: string) => void;
  recordar: (producto: Alimento) => void; // un envasado que se vio (escaneado o buscado)
}

const Contexto = createContext<ComidasValor | null>(null);

export function ProveedorComidas({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroComida[]>([]);
  const [productos, setProductos] = useState<Alimento[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([leerDiarioComidas(), leerProductosOff()]).then(([diario, guardados]) => {
      if (!vigente) return;
      setRegistros(diario);
      setProductos(guardados);
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (listo) guardarDiarioComidas(registros).catch(() => {});
  }, [registros, listo]);
  useEffect(() => {
    if (listo) guardarProductosOff(productos).catch(() => {});
  }, [productos, listo]);

  const recordar = useCallback((producto: Alimento) => {
    if (producto.origen === 'envasado') setProductos((p) => recordarProducto(p, producto));
  }, []);

  const agregar = useCallback(
    (dia: string, comida: Comida, alimento: Alimento, cantidad: Cantidad) => {
      const ahora = new Date();
      setRegistros((r) => agregarRegistro(r, nuevoRegistro(dia, comida, alimento, cantidad, ahora), claveDia(ahora)));
      recordar(alimento);
    },
    [recordar],
  );

  const editar = useCallback((id: string, cambios: Partial<Pick<RegistroComida, 'cantidad' | 'comida'>>) => {
    setRegistros((r) => editarRegistro(r, id, cambios));
  }, []);

  const borrar = useCallback((id: string) => setRegistros((r) => borrarRegistro(r, id)), []);

  const valor = useMemo(
    () => ({ listo, registros, productos, agregar, editar, borrar, recordar }),
    [listo, registros, productos, agregar, editar, borrar, recordar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useComidas(): ComidasValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useComidas tiene que usarse dentro de ProveedorComidas');
  return valor;
}
