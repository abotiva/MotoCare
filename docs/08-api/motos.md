# Servicio de motocicletas

**Estado:** Implementado · **Responsable:** Equipo MotoCare

La página `src/pages/MyBikes.tsx` usa operaciones PostgREST sobre `motorcycles`; la autenticación es la sesión Supabase y RLS exige propiedad. Los cuerpos corresponden a identificación, características, kilometraje y fotografía disponibles en el formulario/tipo.

También se relacionan `motorcycle_documents`, `maintenance_records` y `reminders`. Errores son objetos Supabase mostrados por la UI. No hay API HTTP propia.

