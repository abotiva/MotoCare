# Auditoría técnica inicial y plan de mejoras para MotoCare

## Objetivo

Consolidar los hallazgos de la auditoría técnica inicial de MotoCare y convertirlos en un plan de trabajo accionable para Codex.

## Evaluación inicial

| Área | Calificación |
|---|---:|
| Arquitectura frontend | 8/10 |
| Organización funcional | 8/10 |
| Seguridad | 6.5/10 |
| Pruebas automáticas | 5.5/10 |
| Rendimiento | 7.5/10 |
| Mantenibilidad | 7/10 |
| Preparación para producción | 6/10 |

## Hallazgos principales

### 1. Arquitectura

La base actual es adecuada para un MVP: React, TypeScript, Vite, React Router, Supabase, Tailwind, Zod, React Hook Form y Playwright.

Se recomienda evolucionar hacia una organización por dominios:

```text
src/
  features/
    auth/
    motorcycles/
    maintenance/
    documents/
    routes/
    marketplace/
    clubs/
    notifications/
    admin/
```

### 2. Autenticación y manejo de errores

El contexto de autenticación centraliza sesión, usuario y perfil correctamente, pero existen errores silenciosos.

Pendientes:

- Manejar errores de `supabase.auth.getSession()`.
- Manejar errores de carga de perfil.
- Manejar errores de cierre de sesión.
- Diferenciar perfil inexistente de error de red o de RLS.
- Incorporar estado de error, mensajes controlados y botón de reintento.
- Considerar timeout para consultas bloqueadas.

Ejemplo esperado:

```ts
const { data, error } = await supabase.auth.getSession()

if (error) {
  setAuthError('No fue posible validar la sesión.')
  setSession(null)
} else {
  setSession(data.session)
}
```

### 3. Protección por roles y planes

Actualmente `/app/admin` está dentro del bloque autenticado general, pero no tiene protección explícita de rol en el router.

Crear componentes como:

```tsx
<AdminRoute>
  <Admin />
</AdminRoute>
```

```tsx
<PremiumRoute>
  <PremiumRoutes />
</PremiumRoute>
```

Mantener RLS como control principal y usar estas rutas como capa adicional de seguridad y experiencia de usuario.

### 4. Pruebas automáticas y CI

Playwright fue agregado correctamente como smoke test, pero la cobertura actual es mínima.

El workflow debe ejecutar antes de Playwright:

```yaml
- name: Lint
  run: npm run lint

- name: Build
  run: npm run build

- name: Run Playwright tests
  run: npm run test:e2e
```

También se recomienda probar el build de producción con `vite preview` y no solamente el servidor de desarrollo.

Actualizar `playwright.config.ts` para usar:

```ts
webServer: {
  command: 'npm run preview -- --host 127.0.0.1 --port 4173',
  url: 'http://127.0.0.1:4173',
}
```

El workflow debe ejecutar `npm run build` antes de las pruebas.

### 5. Cobertura E2E prioritaria

Crear pruebas para:

- Registro de usuario.
- Inicio de sesión.
- Creación de una moto.
- Actualización de kilometraje.
- Registro de mantenimiento.
- Programación de mantenimiento futuro.
- Carga y consulta de documentos.
- Protección del panel administrativo.
- Restricciones Free/Premium.
- Publicación y moderación de marketplace.

### 6. Documentación

El README todavía describe Marketplace como una pantalla de “próximamente”, pero el código reciente ya incluye flujos de publicaciones, contacto, notificaciones y administración.

Actualizar la documentación para reflejar:

- Creación de publicaciones.
- Carga de fotografías.
- Detalle de producto.
- Contacto comprador/vendedor.
- Estados de publicación.
- Moderación administrativa.
- Notificaciones.

### 7. Rendimiento

Agregar análisis del bundle con `rollup-plugin-visualizer`.

Revisar:

- Tamaño del bundle inicial.
- Chunks superiores a 500 KB.
- Dependencias duplicadas.
- Carga diferida de mapas y gráficos.
- Compresión de imágenes.
- Uso de WebP o AVIF.
- Carga de mapas únicamente al entrar al módulo correspondiente.

### 8. Dependencias

Revisar las dependencias Radix instaladas y confirmar cuáles se utilizan realmente.

Validar la necesidad de:

```json
"kimi-plugin-inspect-react": "^1.0.3"
```

Confirmar que no se incluya en producción y que no sea una dependencia temporal innecesaria.

### 9. Capacidades centralizadas

Evitar condiciones distribuidas como `profile.plan === 'premium'` por toda la aplicación.

Definir capacidades:

```ts
type Capability =
  | 'motorcycle.manage'
  | 'maintenance.manage'
  | 'documents.manage'
  | 'reports.view'
  | 'routes.premium'
  | 'clubs.premium'
  | 'marketplace.sell'
  | 'admin.access'
```

Y una función central:

```ts
can(user, 'routes.premium')
```

## Prioridades

### P0 — Antes de publicación pública

- [ ] Manejar errores en autenticación y perfil.
- [ ] Proteger el panel administrativo por rol.
- [ ] Verificar RLS de todas las tablas.
- [ ] Ejecutar lint y build en GitHub Actions.
- [ ] Probar el build de producción.
- [ ] Crear pruebas E2E para motos, mantenimientos y documentos.

### P1 — Antes de comenzar a cobrar

- [ ] Centralizar permisos Free/Premium.
- [ ] Probar flujos de marketplace.
- [ ] Registrar eventos y errores.
- [ ] Definir política de eliminación de cuenta y datos.
- [ ] Validar cargas de imágenes por tipo y tamaño.
- [ ] Revisar límites de Supabase Storage.
- [ ] Actualizar documentación.

### P2 — Escalabilidad

- [ ] Organizar código por dominios.
- [ ] Analizar tamaño del bundle.
- [ ] Crear capa de servicios o repositories para Supabase.
- [ ] Añadir pruebas unitarias y de integración.
- [ ] Implementar monitoreo de rendimiento.
- [ ] Preparar versionado y migraciones controladas.

## Instrucción para Codex

Trabajar primero sobre los puntos P0. Hacer cambios pequeños, verificables y separados por commits. Para cada cambio:

1. Explicar el problema corregido.
2. Indicar archivos modificados.
3. Ejecutar `npm run lint`.
4. Ejecutar `npm run build`.
5. Ejecutar `npm run test:e2e`.
6. No modificar comportamiento funcional no relacionado.
7. Mantener compatibilidad con Supabase y Vercel.

El primer bloque recomendado es:

1. Endurecimiento de `AuthContext`.
2. Creación de `AdminRoute` y protección de `/app/admin`.
3. Ajuste de CI para lint, build y pruebas de producción.
4. Ampliación inicial de pruebas E2E.
