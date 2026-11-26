-- Usuarios identificados por el ID aleatorio del dispositivo (header X-Dispositivo), sin login por ahora.
CREATE TABLE usuarios (
  id     uuid PRIMARY KEY,
  creado timestamptz NOT NULL DEFAULT now()
);

-- Cuántas fotos y mensajes de IA usó cada usuario por día (día de Argentina).
CREATE TABLE uso_diario (
  usuario  uuid    NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  fecha    date    NOT NULL,
  fotos    integer NOT NULL DEFAULT 0 CHECK (fotos >= 0),
  mensajes integer NOT NULL DEFAULT 0 CHECK (mensajes >= 0),
  PRIMARY KEY (usuario, fecha)
);
