import { useEffect, useState } from 'react';

// La hora actual, refrescada cada `intervaloMs` (para cronómetros y cuentas regresivas).
export function useAhora(intervaloMs = 1000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(intervalo);
  }, [intervaloMs]);
  return ahora;
}
