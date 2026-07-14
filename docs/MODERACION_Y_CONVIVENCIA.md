# Moderacion y convivencia MotoCare

MotoCare no permite reacciones violentas, acoso, amenazas, intimidacion, spam ni promociones comerciales fuera de una licencia Business activa.

## Conductas reportables

- Violencia, amenazas o incitacion a dano.
- Acoso, insultos, discriminacion o persecucion de otros usuarios.
- Spam, mensajes repetitivos o enlaces abusivos.
- Promociones, ventas o publicidad no cobijadas bajo licencia Business.
- Suplantacion, contenido enganoso u otra conducta que afecte la seguridad de la comunidad.

## Flujo implementado

1. Un usuario reporta una publicacion, mensaje de club o club.
2. El reporte queda en `moderation_reports` con estado `pending`.
3. Un administrador revisa la pestana Moderacion.
4. El administrador puede emitir advertencia, bloqueo temporal o eliminacion logica.
5. La accion queda registrada en `moderation_actions`.
6. El usuario afectado o el dueno del club recibe una notificacion interna tipo `moderation_notice`.

## Acciones administrativas

- Advertencia: deja trazabilidad y notifica al usuario.
- Bloqueo temporal: marca usuario o club como `suspended` y define `moderation_until`.
- Eliminacion logica: marca usuario o club como `deleted` sin borrar evidencia.

## Nota operativa

Ejecutar `supabase/moderation_migration.sql` en Supabase para habilitar tablas, politicas RLS y RPCs.
