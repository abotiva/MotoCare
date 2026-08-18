# Servicio de rutas

**Estado técnico:** Implementado/parcial · **Estado de producto:** Planeado fuera del lanzamiento Free

**Responsable:** Equipo MotoCare

`src/pages/Map.tsx`, `RouteDetail.tsx` y módulos relacionados usan PostgREST sobre `routes`, `saved_routes` y datos de marketplace. La sesión y RLS controlan propiedad/visibilidad. Storage y RPC soportan archivos GPX y derechos en migraciones específicas.

No debe considerarse disponible comercialmente hasta aprobar [RFC-002](../rfc/RFC-002-Rutas.md) y validar migraciones desplegadas.
