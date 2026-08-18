# Estrategia de testing

**Estado:** Borrador · **Responsable:** Equipo MotoCare

El repositorio tiene Playwright para E2E (`npm run test:e2e`), TypeScript en build y ESLint. No se encontró runner unitario dedicado.

Pirámide inicial: validación estática en cada cambio; pruebas unitarias al extraer reglas críticas; integración contra Supabase aislado para RLS/RPC/Storage; E2E para cuenta, moto, mantenimiento y notificaciones; exploratorias de accesibilidad, responsive, red y permisos.

Toda prueba debe registrar entorno, datos, resultado y evidencia.

