# MotoCare MVP Alpha

MotoCare es una app MVP para moteros enfocada en mantenimiento de la moto, rutas, comunidad, clubes y perfil del usuario.

Estado actual: **MVP Alpha**. No es una version publica 1.0.

## Funcionalidades

- Login con Supabase Auth.
- Perfil de usuario con avatar, bio, ciudad, moto principal y clubes.
- Mi moto: motos, documentos, kilometraje, mantenimientos, recordatorios y pendientes.
- Rutas: creacion manual, estado, fechas, notificaciones y mapas embebidos.
- Comunidad: publicaciones, imagenes, likes, comentarios y rutas adjuntas.
- Clubes: crear club, editar informacion, imagen, miembros y mensajes privados.
- Explorar: rutas publicas, publicaciones y rutas guardadas.
- Tienda/Marketplace: pantalla visual en estado proximamente.
- Ajustes basicos de cuenta y preferencias locales.

## Stack

- React + TypeScript + Vite.
- Supabase para Auth, PostgreSQL, Storage y RLS.
- Google Maps Embed para vista de mapas de rutas.
- Tailwind CSS y componentes UI locales.

## Variables de entorno

Crear un archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_EMBED_KEY=your-google-maps-embed-api-key
```

El archivo `.env` no debe subirse a GitHub.

## Supabase

Para una base nueva, ejecutar:

```txt
supabase/schema.sql
```

Para bases existentes, revisar y ejecutar las migraciones necesarias en `supabase/`:

- `maintenance_suggestions_migration.sql`
- `profile_primary_motorcycle_migration.sql`
- `profile_bio_social_migration.sql`
- `route_status_migration.sql`
- `route_dates_migration.sql`
- `notifications_migration.sql`
- `saved_routes_migration.sql`
- `post_images_migration.sql`
- `storage_migration.sql`
- `storage_delete_policy_migration.sql`
- `clubs_migration.sql`

## Google Maps

La integracion actual usa Maps Embed API.

Antes de publicar, restringir la API key en Google Cloud:

- Permitir solo **Maps Embed API**.
- Restringir al dominio real de MotoCare.
- En desarrollo local puede permitirse `http://127.0.0.1:*` o `http://localhost:*`.

## Desarrollo

```bash
npm install
npm run dev
```

Si Vite bloquea `node_modules/.vite` en Windows, el proyecto usa `cacheDir: '.vite-cache'` en `vite.config.ts`.

## Build

```bash
npm run build
```

## Documentacion

- `docs/MANUAL_USUARIO.md`
- `docs/MANUAL_ADMINISTRADOR.md`
