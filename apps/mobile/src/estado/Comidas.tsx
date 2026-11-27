// Diario de comidas, productos envasados ya usados y alimentos propios, guardados en el celu.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  guardarAlimentosPropios,
  guardarDiarioComidas,
  guardarProductosOff,
  leerAlimentosPropios,
  leerDiarioComidas,
  leerProductosOff,
} from '../lib/almacenamiento';
import type { Alimento, Nutrientes } from '../lib/comida/alimentos';
import { corregirAproximado } from '../lib/comida/aproximados';
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
import { guardarPropio } from '../lib/comida/propios';
import { claveDia } from '../lib/pasosManuales';

export interface ComidasValor {
  listo: boolean;
  registros: RegistroComida[];
  productos: Alimento[]; // envasados ya usados, el último primero
  propios: Alimento[]; // creados por el usuario, el último primero
  agregar: (dia: string, comida: Comida, alimento: Alimento, cantidad: Cantidad) => void;
  editar: (id: string, cambios: Partial<Pick<RegistroComida, 'cantidad' | 'comida'>>) => void;
  borrar: (id: string) => void;
  recordar: (producto: Alimento) => void; // un envasado que se vio (escaneado o buscado)
  crearPropio: (alimento: Alimento) => void;
  // Todo el diario de una vez (acciones del coach y su deshacer).
  reemplazarRegistros: (registros: RegistroComida[]) => void;
  // Los valores cada 100 g de un alimento aproximado, en todos los registros que lo tienen.
  corregirValores: (alimentoId: string, valores: Nutrientes) => void;
}

const Contexto = createContext<ComidasValor | null>(null);

export function ProveedorComidas({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroComida[]>([]);
  const [productos, setProductos] = useState<Alimento[]>([]);
  const [propios, setPropios] = useState<Alimento[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([leerDiarioComidas(), leerProductosOff(), leerAlimentosPropios()]).then(
      ([diario, guardados, creados]) => {
        if (!vigente) return;
        setRegistros(diario);
        setProductos(guardados);
        setPropios(creados);
        setListo(true);
      },
    );
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
  useEffect(() => {
    if (listo) guardarAlimentosPropios(propios).catch(() => {});
  }, [propios, listo]);

  const crearPropio = useCallback((alimento: Alimento) => setPropios((p) => guardarPropio(p, alimento)), []);

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

  const reemplazarRegistros = useCallback((r: RegistroComida[]) => setRegistros(r), []);
  const corregirValores = useCallback(
    (alimentoId: string, valores: Nutrientes) => setRegistros((r) => corregirAproximado(r, alimentoId, valores)),
    [],
  );

  const valor = useMemo(
    () => ({
      listo,
      registros,
      productos,
      propios,
      agregar,
      editar,
      borrar,
      recordar,
      crearPropio,
      reemplazarRegistros,
      corregirValores,
    }),
    [listo, registros, productos, propios, agregar, editar, borrar, recordar, crearPropio, reemplazarRegistros, corregirValores],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useComidas(): ComidasValor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useComidas tiene que usarse dentro de ProveedorComidas');
  return valor;
}
