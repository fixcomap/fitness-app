// De dónde salen los pasos del celu. Las pantallas sólo conocen esta interfaz:
// hoy la implementa el podómetro (expo-sensors) y más adelante se puede cambiar
// por Apple Salud o Health Connect tocando sólo `fuente.ts`.

export type EstadoPermiso = 'concedido' | 'denegado' | 'sin-preguntar';

export interface FuenteActividad {
  // Nombre para mostrar: "Podómetro", "Apple Salud", "Health Connect"…
  readonly nombre: string;
  // Si esta fuente puede dar pasos por rango de fechas en este celu.
  disponible(): Promise<boolean>;
  permiso(): Promise<EstadoPermiso>;
  pedirPermiso(): Promise<EstadoPermiso>;
  // Pasos entre dos fechas. Puede fallar: usá `leerPasos` de consultas.ts para no romper la pantalla.
  pasosEntre(inicio: Date, fin: Date): Promise<number>;
}
