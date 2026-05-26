# MotoCare MVP tecnico

## Incluido

- Modelo de datos inicial en `supabase/schema.sql`.
- Autenticacion con Supabase Auth.
- Rutas protegidas para `/app`.
- Login y registro por email/password.
- Modulo `Mi moto` conectado a Supabase:
  - listar motos del usuario
  - crear moto
  - crear recordatorios iniciales de SOAT y tecnomecanica
  - registrar servicios de mantenimiento
  - actualizar kilometraje al registrar servicio
  - marcar recordatorios como completados

## Configuracion

1. Crear un proyecto en Supabase.
2. Abrir Supabase SQL Editor y ejecutar `supabase/schema.sql`.
3. Copiar `.env.example` a `.env`.
4. Completar:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Instalar dependencias y correr la app:

```bash
npm install
npm run dev
```

## Siguiente backlog recomendado

1. Agregar login con Google.
2. Subida de fotos/documentos a Supabase Storage.
3. Edicion de moto y vencimientos.
4. Crear recordatorios por kilometraje.
5. Feed social conectado a `posts`, `post_comments` y `post_likes`.
6. Rutas guardadas conectadas a `routes`.
