# Base de datos

**Estado:** En revisión · **Responsable:** Equipo MotoCare

Supabase PostgreSQL almacena perfiles, motocicletas, mantenimientos, recordatorios, documentos, rutas, publicaciones, notificaciones, clubes, licencias y marketplace. La base declarativa es `supabase/schema.sql`; las migraciones agregan cambios posteriores.

Los UUID se vinculan a `auth.users`. RLS protege recursos propios y las RPC separan operaciones administrativas. No se debe asumir que una migración está desplegada por existir en Git; cada release debe comparar el entorno real y preparar respaldo y reversión.
