# Arquitectura general

**Estado:** En revisión · **Versión:** 0.1 · **Responsable:** Equipo MotoCare

MotoCare es una SPA con React 19, TypeScript y Vite. React Router controla navegación y rutas protegidas. Tailwind CSS y componentes locales basados en Radix UI forman la interfaz.

El cliente usa Supabase para Auth, PostgreSQL, RPC y Storage. El esquema aplica RLS. No se encontró un backend independiente.

```mermaid
flowchart LR
  U[Usuario] --> SPA[React SPA]
  SPA --> AUTH[Supabase Auth]
  SPA --> DB[PostgreSQL + RLS]
  SPA --> RPC[Funciones RPC]
  SPA --> ST[Supabase Storage]
  SPA --> MAP[Servicios de mapas]
```

`src/pages` contiene pantallas; `src/components`, `src/layouts` y `src/contexts`, UI y sesión; `src/lib`, integraciones; `supabase`, datos; `tests`, Playwright.
