# Seguridad

**Estado:** En revisión · **Responsable:** Equipo MotoCare

Controles verificados: Supabase Auth, rutas protegidas en cliente, RLS, políticas de Storage y RPC administrativas. La protección visual no sustituye los controles del servidor.

Pendientes: auditar `SECURITY DEFINER`, `search_path` y permisos; restringir claves de mapas; definir incidentes, respaldos, MFA administrativo y análisis de dependencias. Nunca se deben versionar `.env` ni claves de servicio.
