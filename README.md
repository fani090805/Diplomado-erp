# ERP

ERP monorepo con backend API y cliente Expo.

## Requisitos

- Node.js 22+
- pnpm 9+
- MongoDB Atlas
- Android Studio / Expo Go (para Android)

## Instalación

1. Instala pnpm:
   ```bash
   corepack enable
   corepack prepare pnpm@9.15.0 --activate
   ```
2. En la raíz del proyecto:
   ```bash
   pnpm install
   ```
3. Copia el ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
4. Ajusta los valores reales en `.env`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

## Desarrollo

- API: `pnpm --filter api dev`
- Cliente web: `pnpm --filter client web`
- Cliente Android: `pnpm --filter client android`

## Base de datos

Crea un cluster en MongoDB Atlas y configura la cadena de conexión en `.env`.
