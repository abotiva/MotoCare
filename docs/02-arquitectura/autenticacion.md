# Autenticación

**Estado:** En revisión · **Responsable:** Equipo MotoCare

`AuthContext.tsx` obtiene y observa la sesión de Supabase e implementa correo/contraseña, registro y cierre. `ProtectedRoute` restringe `/app`; `AdminRoute` consulta `is_current_user_admin`.

La aceptación versionada se registra mediante metadatos validados por el trigger de alta y tablas protegidas con RLS. Un gate consulta versiones publicadas pendientes. La eliminación de cuenta se inicia como solicitud auditable; el borrado definitivo continúa pendiente de un procedimiento operativo aprobado.

Pendientes: comprobar recuperación de contraseña, redirecciones y procesamiento final de eliminación.
