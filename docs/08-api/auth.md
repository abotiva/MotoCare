# Servicio de autenticación

**Estado:** Implementado · **Responsable:** Equipo MotoCare

| Operación | Interfaz | Autenticación | Implementación |
|---|---|---|---|
| Obtener sesión | `supabase.auth.getSession()` | No previa | `src/contexts/AuthContext.tsx` |
| Iniciar sesión | `signInWithPassword({email,password})` | No | mismo archivo |
| Registrar | `signUp({email,password,...})` | No | mismo archivo |
| Cerrar sesión | `signOut()` | Sesión | mismo archivo |

La respuesta y errores corresponden a Supabase Auth. Recuperación y aceptación legal versionada requieren verificación/implementación.

