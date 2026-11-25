# Fitness app

App móvil (iOS y Android) que junta entrenamiento de musculación, conteo de calorías, actividad diaria y un coach con IA.

> Nombre provisorio: el definitivo todavía no está decidido.

## Estructura

```
apps/
├── api/      API Node + Express (Cloud Run), Postgres en Neon
└── mobile/   App Expo + React Native + TypeScript
db/
└── migrations/   esquema de la base, se aplica en orden con npm run migrar
```

## Desarrollo local

Requisitos: Node 22+, Docker.

```bash
cp .env.example .env          # y completar POSTGRES_PASSWORD
docker compose up -d          # Postgres local

cd apps/api
npm install
npm run migrar
npm run dev                   # http://localhost:3000/salud

cd ../mobile
npm install
npm start                     # escaneá el QR con Expo Go
```

## Calidad

Cada paquete (`apps/api`, `apps/mobile`) tiene `npm run lint` y `npm test`. El pipeline los corre en cada PR.

## CI/CD

Usa el pipeline estándar de fixcomap: `.github/workflows/ci.yml` es la copia canónica de
`platform/caller/ci.yml` y no se edita. Qué se ejecuta y dónde se despliega lo define
`catalog/<repo>.yaml` en [fixcomap/platform](https://github.com/fixcomap/platform). Mientras
este repo no tenga entrada en el catálogo, el pipeline no hace nada (no-action).

Los builds de la app móvil (EAS) todavía no están en el pipeline.

## Contribuir

GitFlow y commits según el [CONTRIBUTING de platform](https://github.com/fixcomap/platform/blob/main/CONTRIBUTING.md).
