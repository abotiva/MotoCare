# MotoCare MVP tecnico

## Incluido

- Modelo de datos inicial en `supabase/schema.sql`.
- Autenticacion con Supabase Auth.
- Rutas protegidas para `/app`.
- Login y registro por email/password.
- Modulo `Mi moto` conectado a Supabase:
  - listar motos del usuario
  - crear moto
  - editar moto
  - crear recordatorios iniciales de SOAT y tecnomecanica
  - registrar servicios de mantenimiento
  - actualizar kilometraje al registrar servicio
  - marcar recordatorios como completados
  - subir foto de la moto a Supabase Storage
  - subir documentos de SOAT, tecnomecanica y otros soportes
- Tarjetas de metricas navegables en Perfil, Rutas, Comunidad, Notificaciones y Administracion.
- CRUD administrativo del catalogo `maintenance_suggestions`, protegido por `is_current_user_admin()`.
- Marketplace conectado a Supabase con revisión administrativa.
- Publicación de rutas Premium gratuitas o de pago.
- Límite transaccional de cinco rutas gratuitas por mes.
- GPX privado con URL firmada y derechos mensuales con vencimiento.

## Configuracion

1. Crear un proyecto en Supabase.
2. Abrir Supabase SQL Editor y ejecutar `supabase/schema.sql`.
   - Si ya habias ejecutado el esquema antes de agregar Storage, ejecuta tambien `supabase/storage_migration.sql`.
   - Para habilitar la gestion administrativa del catalogo en una base existente, ejecuta `supabase/admin_catalog_crud_migration.sql`.
   - Para rutas Premium, ejecuta en orden `supabase/marketplace_migration.sql`, `supabase/premium_routes_monthly_migration.sql` y `supabase/premium_route_gpx_expiry_migration.sql`.
3. Copiar `.env.example` a `.env`.
4. Completar:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Instalar dependencias y correr la app:

```bash
npm install
npm run dev
```

## Siguiente backlog recomendado

1. Agregar login con Google.
2. Subida de fotos/documentos a Supabase Storage.
3. Edicion de moto y vencimientos.
4. Crear recordatorios por kilometraje.
5. Feed social conectado a `posts`, `post_comments` y `post_likes`.
6. Rutas guardadas conectadas a `routes`.
