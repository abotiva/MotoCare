# Servicio de mantenimientos

**Estado:** Implementado · **Responsable:** Equipo MotoCare

Supabase PostgREST opera sobre `maintenance_records`, `reminders` y `maintenance_suggestions`. Requiere sesión; RLS protege registros propios y reserva escritura de catálogo a administración.

Parámetros se derivan del esquema SQL y tipos del cliente. La entrega externa de recordatorios es parcial: solo se confirmó persistencia/notificación interna.

