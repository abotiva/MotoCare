# MotoCare MVP Alpha

MotoCare es una app MVP para moteros enfocada en la hoja de vida de la moto, mantenimientos realizados, mantenimientos programados, documentos y perfil del usuario.

Estado actual: **MVP Alpha**. No es una version publica 1.0.

## Funcionalidades

- Login con Supabase Auth.
- Perfil de usuario con avatar, bio, ciudad, moto principal y clubes.
- Hoja de vida: motos, documentos, kilometraje, mantenimientos realizados, recordatorios y pendientes programados.
- Dashboard principal enfocado en motos, servicios, programados y documentos.
- Tarjetas de resumen interactivas en Perfil, Rutas, Comunidad, Notificaciones y Administracion, con acceso al detalle o filtro relacionado.
- Rutas: creacion manual, estado, fechas, notificaciones y mapas embebidos. Free y Premium pueden descubrir y guardar rutas comunitarias; compartir rutas y cargar GPX propios requiere Premium.
- Rutas guardadas: biblioteca disponible para Free y Premium, reutilizable como base de una ruta nueva y administrable desde Mis rutas.
- Comunidad: publicaciones, imagenes, likes, comentarios y rutas adjuntas para cuentas Free y Premium.
- Clubes: Free puede pertenecer a un club por invitacion; Premium puede crear y administrar hasta tres clubes.
- Directorio de servicios: busqueda y contacto con talleres, gruas, montallantas y otros proveedores; las publicaciones Business son moderadas.
- Ajustes basicos de cuenta y preferencias locales.
- Panel administrativo con gestion de licencias, moderacion y CRUD del catalogo de mantenimientos.

## Arquitectura de producto

- Usuarios Free: una moto, mantenimiento basico, comunidad, rutas privadas, descubrimiento y rutas guardadas, acceso por invitacion a un club y consulta del directorio de servicios.
- Usuarios Premium: hasta tres motos, documentos, informes, rutas/GPX, rutas guardadas, comunidad, hasta tres clubes y cinco rutas Premium mensuales. Una moto eliminada solo puede reemplazarse una vez por ano calendario.
- Business: cuenta exclusivamente comercial. Publica servicios moderados, administra su perfil publico, ubicacion y mensajes; no acumula garaje, rutas personales, comunidad, clubes, informes ni notificaciones Premium.

Las compras y ventas dentro de MotoCare estan deshabilitadas en esta etapa. La contratacion y el pago de servicios se acuerdan directamente con el proveedor.

El menu de moteros prioriza Inicio, Hoja de vida, Mantenimientos, Programados, Documentos y Reportes. Business muestra una experiencia comercial separada centrada en el directorio de servicios.

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
supabase/license_definition_consolidation_migration.sql
supabase/colombia_locations_migration.sql
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
- `license_definition_consolidation_migration.sql` (ejecutar despues de las migraciones funcionales)
- `colombia_locations_migration.sql` (ejecutar al final; catalogo oficial DIVIPOLA y relaciones de ubicacion)
- `business_services_expansion_migration.sql` (categorias, estados y perfil comercial Business)
- `business_map_url_migration.sql` (enlace validado de Google Maps, Waze u OpenStreetMap para el perfil Business)
- `saved_routes_license_access_migration.sql` (rutas guardadas para Free y Premium; excluye Business)

La migracion `admin_catalog_crud_migration.sql` permite crear, editar, activar, desactivar y eliminar elementos del catalogo exclusivamente a usuarios registrados en `public.app_admins`.

Las migraciones de Marketplace deben ejecutarse en el orden mostrado. La migracion de consolidacion se ejecuta al final: migra `pro` a `premium`, aplica los limites de motos, separa Business de las funciones personales, valida el vencimiento documental y restringe las publicaciones al directorio de servicios Business.

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
- `docs/LICENCIAS_Y_ADMINISTRACION.md`
- `docs/ECOSISTEMA_MOTOCARE_ROADMAP.md`
- `docs/MODERACION_Y_CONVIVENCIA.md`
