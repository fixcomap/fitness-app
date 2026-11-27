-- Consejos del día del coach (POST /coach/consejo): contador aparte, no descuenta de los mensajes.
ALTER TABLE uso_diario
  ADD COLUMN consejos integer NOT NULL DEFAULT 0 CHECK (consejos >= 0);
