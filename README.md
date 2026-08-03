# MotoCare MVP Alpha

MotoCare es una app MVP para moteros enfocada en la hoja de vida de la moto, mantenimientos realizados, mantenimientos programados, documentos y perfil del usuario.

Estado actual: **MVP Alpha**. No es una version publica 1.0.

## Funcionalidades

- Login con Supabase Auth.
- Perfil de usuario con avatar, bio, ciudad, moto principal y clubes.
- Hoja de vida: motos, documentos, kilometraje, mantenimientos realizados, recordatorios y pendientes programados.
- Dashboard principal enfocado en motos, servicios, programados y documentos.
- Tarjetas de resumen interactivas en Perfil, Rutas, Comunidad, Notificaciones y Administracion, con acceso al detalle o filtro relacionado.
- Rutas: creacion manual, estado, fechas, notificaciones y mapas embebidos. Esta funcionalidad queda orientada a Premium.
- Comunidad: publicaciones, imagenes, likes, comentarios y rutas adjuntas. Esta funcionalidad queda orientada a Premium.
- Clubes: crear club, editar informacion, imagen, miembros y mensajes privados. Esta funcionalidad queda orientada a Premium.
- Explorar: modulo retirado de la navegacion activa; las rutas comunitarias se reservaran para Premium.
- Tienda/Marketplace: catalogo, busqueda, favoritos, contacto entre comprador y vendedor, publicaciones moderadas y cierre de ventas de una sola unidad.
- Ajustes basicos de cuenta y preferencias locales.
- Panel administrativo con gestion de licencias, moderacion y CRUD del catalogo de mantenimientos.

## Arquitectura de producto

- Usuarios Free: hoja de vida de la moto, mantenimientos realizados, pendientes programados y documentos.
- Usuarios Premium: informes de mantenimiento y modulos avanzados como rutas, comunidad y clubes. En la tienda pueden publicar motos, repuestos o accesorios de una sola unidad, con hasta 5 publicaciones aprobadas por mes.
- Business: licencia para tiendas y aliados que permite publicar productos y servicios comerciales sin limite mensual de publicaciones.

En la tienda, guardar un borrador o enviarlo a revision no consume cupo. Para Premium, el cupo mensual se descuenta unicamente cuando un administrador aprueba la publicacion. Los servicios estan reservados para Business; las ventas directas Premium no admiten servicios.

El menu principal prioriza Inicio, Hoja de vida, Mantenimientos, Programados, Documentos y Reportes. Rutas, Comunidad, Clubes y Tienda quedan agrupados como funciones Premium.

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
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-javascript-api-key
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
- `route_motorcycle_migration.sql`
- `notifications_migration.sql`
- `saved_routes_migration.sql`
- `post_images_migration.sql`
- `storage_migration.sql`
- `storage_delete_policy_migration.sql`
- `clubs_migration.sql`
- `admin_catalog_crud_migration.sql`
- `marketplace_migration.sql`
- `marketplace_sales_contact_migration.sql`
- `admin_marketplace_review_migration.sql`
- `marketplace_personal_sales_phase_one_migration.sql`
- `marketplace_personal_sales_phase_two_business_services_migration.sql`
- `marketplace_quota_on_approval_migration.sql`

La migracion `admin_catalog_crud_migration.sql` permite crear, editar, activar, desactivar y eliminar elementos del catalogo exclusivamente a usuarios registrados en `public.app_admins`.

Las migraciones de Marketplace deben ejecutarse en el orden mostrado. `marketplace_quota_on_approval_migration.sql` corrige instalaciones anteriores: elimina cupos creados prematuramente para borradores o publicaciones pendientes y hace que el consumo ocurra al aprobar.

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
