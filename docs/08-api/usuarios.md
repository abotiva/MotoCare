# Servicio de usuarios

**Estado:** Parcial · **Responsable:** Equipo MotoCare

El cliente consulta y actualiza `profiles` mediante Supabase PostgREST; RLS limita edición al propietario y permite lecturas públicas acotadas según las políticas. RPC verificadas incluyen `community_public_profiles` y búsquedas para invitaciones.

Parámetros y respuesta siguen las columnas tipadas en `src/types/database.ts`. No existe endpoint propio. Eliminación integral de cuenta: **planeada, pendiente de confirmar**.

