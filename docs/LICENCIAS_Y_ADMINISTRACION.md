# Licencias y administracion - MotoCare

Documento de trabajo para definir las licencias comerciales de MotoCare y el manejo interno de administradores.

## Objetivo de las licencias

MotoCare debe tener tres niveles faciles de entender:

- Gratis: entrada basica para que cualquier motero pruebe la app.
- Premium: experiencia completa para el motero individual.
- Business: herramientas comerciales para talleres, marcas, aliados, negocios o administradores de varias motos/personas.

La diferencia principal no debe ser solo "mas funciones", sino el tipo de usuario:

- Gratis: uso personal limitado.
- Premium: control completo de mis motos.
- Business: gestion profesional de motos, clientes, clubes o negocio.

## Resumen comercial

| Caracteristica | Gratis | Premium | Business |
| --- | --- | --- | --- |
| Tipo de usuario | Motero nuevo o curioso | Motero individual activo | Taller, club, negocio o gestor |
| Motos registradas | 1 moto | Hasta 3 o 5 motos | Muchas o ilimitadas |
| Historial de mantenimiento | Limitado | Completo | Completo por moto, cliente o miembro |
| Recordatorios | Basicos | Avanzados por kilometraje y fecha | Avanzados para varias motos/personas |
| Estadisticas | Basicas o no disponibles | Gastos, kilometraje y servicios | Reportes operativos y comparativos |
| Rutas | Uso limitado | Rutas guardadas ilimitadas | Rutas y gestion para grupos/clubes |
| Comunidad | Ver y participar | Participacion completa | Visibilidad destacada |
| Clubes | Unirse a clubes | Crear y administrar clubes pequenos | Gestion avanzada de clubes grandes |
| Marketplace | Ver publicaciones y comprar | Publicar como persona natural | Publicar como negocio, aliado o perfil comercial |
| Perfil | Basico | Perfil mejorado | Perfil comercial/profesional |
| Publicidad | Puede tener | Sin publicidad | Sin publicidad |
| Soporte | Estandar | Prioritario | Prioritario/comercial |

## Licencia Gratis

### Perfil

Para usuarios que quieren probar MotoCare sin pagar.

### Beneficios

- Registro de cuenta.
- 1 moto registrada.
- Historial limitado de mantenimientos, por ejemplo los ultimos 5 registros.
- Recordatorios basicos de mantenimiento.
- Acceso a comunidad.
- Ver rutas compartidas.
- Ver marketplace.
- Unirse a clubes.
- Perfil basico.

### Limites sugeridos

- No permitir mas de 1 moto.
- Limitar historial visible o cantidad de registros activos.
- Limitar rutas guardadas.
- No permitir publicaciones de venta, pero si permitir ver y comprar en marketplace.
- Mostrar invitacion a mejorar plan cuando el usuario llegue a un limite.
- Puede incluir publicidad o mensajes promocionales internos.

### Mensaje comercial

"Empieza a cuidar tu moto y conoce la comunidad MotoCare."

## Licencia Premium

### Perfil

Para el motero individual que quiere controlar bien sus motos, mantenimientos, rutas y gastos.

### Beneficios

- Hasta 3 o 5 motos registradas.
- Historial completo de mantenimientos.
- Recordatorios avanzados por fecha y kilometraje.
- Registro de gastos por mantenimiento.
- Estadisticas de kilometraje, servicios y costos.
- Rutas guardadas ilimitadas.
- Crear y administrar clubes pequenos.
- Publicaciones en marketplace como persona natural.
- Perfil publico mejorado.
- Sin publicidad.
- Respaldo completo en la nube.
- Soporte prioritario.

### Diferenciadores frente a Gratis

- Pasa de "registro basico" a control completo.
- El usuario puede ver toda la historia de su moto.
- Los recordatorios se vuelven mas utiles y personalizables.
- La app empieza a entregar estadisticas y no solo almacenamiento.
- Se elimina la publicidad.

### Mensaje comercial

"Control completo de tus motos, mantenimientos, gastos y rutas."

## Licencia Business

### Perfil

Para talleres, clubes, negocios, marcas, aliados o usuarios que administran motos de otras personas o venden de forma comercial.

### Beneficios

- Muchas motos registradas o motos ilimitadas segun la estrategia comercial.
- Gestion de clientes, miembros o terceros.
- Panel administrativo avanzado.
- Roles de equipo: dueno, administrador y colaborador.
- Reportes por moto, cliente, club o negocio.
- Recordatorios de mantenimiento para varias motos/personas.
- Historial completo por cliente o miembro.
- Publicaciones comerciales en marketplace.
- Perfil comercial o profesional verificado.
- Gestion de clubes grandes.
- Mayor visibilidad dentro de la app.
- Soporte prioritario/comercial.
- Herramientas para taller: servicios realizados, proximos mantenimientos, historial por cliente.

### Diferenciadores frente a Premium

- Premium es para administrar mis motos.
- Business es para administrar motos, clientes, miembros o servicios de terceros, y para vender como negocio.
- Incluye herramientas de negocio, reportes y roles de equipo.
- Puede tener beneficios comerciales dentro de marketplace.

### Mensaje comercial

"Gestion comercial para talleres, clubes y negocios moteros."

## Reglas de producto recomendadas

### Gratis

Gratis debe permitir que el usuario sienta el valor de MotoCare sin reemplazar completamente a Premium.

Buenas funciones para Gratis:

- Crear una moto.
- Registrar algunos mantenimientos.
- Recibir recordatorios basicos.
- Participar en comunidad.

Funciones que conviene reservar:

- estadisticas completas;
- historial ilimitado;
- multiples motos;
- publicar ventas en marketplace;
- gestion de clubes;
- reportes.

### Premium

Premium debe sentirse como el plan natural para un motero individual.

Buenas funciones para Premium:

- historial completo;
- multiples motos personales;
- recordatorios inteligentes;
- rutas ilimitadas;
- estadisticas;
- perfil mejorado;
- sin publicidad.

### Business

Business debe sonar y funcionar como una herramienta de trabajo.

Buenas funciones para Business:

- multiples usuarios o roles;
- clientes;
- motos de terceros;
- reportes;
- perfil comercial;
- publicaciones destacadas;
- gestion avanzada de clubes;
- soporte comercial.

## Administracion actual de la app

El modulo interno de administracion existe en:

`/app/admin`

La app muestra el enlace **Administracion** solo cuando el usuario autenticado esta registrado en la tabla:

`public.app_admins`

La validacion se hace con la funcion de Supabase:

`public.is_current_user_admin()`

Si un usuario intenta entrar a `/app/admin` sin estar en `app_admins`, la pantalla muestra acceso restringido.

## Quien maneja la administracion

La administracion la manejan los usuarios registrados en `public.app_admins`.

La tabla actual tiene estos campos:

- `user_id`: id del perfil del usuario administrador. Corresponde a `profiles.id`.
- `role`: rol interno. Puede ser `owner` o `admin`.
- `created_at`: fecha en que se agrego.

Roles actuales:

- `owner`: propietario o administrador principal de MotoCare.
- `admin`: administrador interno.

Nota: en la version actual ambos roles tienen acceso al mismo panel. La diferencia sirve para futuras reglas, por ejemplo permitir que solo `owner` pueda agregar o quitar administradores desde una pantalla interna.

## Como agregar administradores

Por ahora se agregan desde Supabase, usando SQL Editor.

### Paso 1: conseguir el ID del usuario

El usuario debe existir en MotoCare. Su id se consulta en:

`public.profiles`

Ejemplo para buscar por usuario:

```sql
select id, full_name, username, created_at
from public.profiles
where username = 'usuario_a_buscar';
```

Ejemplo para buscar por nombre:

```sql
select id, full_name, username, created_at
from public.profiles
where full_name ilike '%nombre%';
```

### Paso 2: agregarlo como owner

```sql
insert into public.app_admins (user_id, role)
values ('ID_DEL_USUARIO', 'owner')
on conflict (user_id) do update set role = excluded.role;
```

### Paso 3: agregarlo como admin

```sql
insert into public.app_admins (user_id, role)
values ('ID_DEL_USUARIO', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

## Como quitar administradores

Desde Supabase SQL Editor:

```sql
delete from public.app_admins
where user_id = 'ID_DEL_USUARIO';
```

## Como cambiar el rol de un administrador

Cambiar de `admin` a `owner`:

```sql
update public.app_admins
set role = 'owner'
where user_id = 'ID_DEL_USUARIO';
```

Cambiar de `owner` a `admin`:

```sql
update public.app_admins
set role = 'admin'
where user_id = 'ID_DEL_USUARIO';
```

## Como listar administradores actuales

```sql
select
  a.user_id,
  a.role,
  a.created_at,
  p.full_name,
  p.username
from public.app_admins a
left join public.profiles p on p.id = a.user_id
order by a.created_at desc;
```

## Funciones actuales del panel admin

La primera version del panel es principalmente de lectura operativa.

Incluye:

- resumen general de usuarios;
- usuarios publicos y privados;
- motos registradas;
- rutas;
- publicaciones;
- clubes;
- invitaciones pendientes;
- catalogo de mantenimientos sugeridos.

El panel respeta privacidad:

- si un usuario tiene perfil privado, el panel muestra datos enmascarados;
- no muestra correos ni informacion privada de autenticacion;
- para clubes, si el fundador tiene perfil privado, aparece como fundador privado.

## Mejoras recomendadas para administracion

Para que la administracion sea mas completa, conviene agregar despues:

- pantalla para agregar/quitar administradores sin entrar a Supabase;
- regla para que solo usuarios `owner` puedan administrar otros administradores;
- auditoria de cambios administrativos;
- modulo para administrar licencias Gratis, Premium y Business;
- campos de licencia en `profiles` o una tabla separada `user_subscriptions`;
- integracion futura con pagos.

## Tabla sugerida futura para licencias

Opcion simple:

```sql
alter table public.profiles
add column if not exists license_plan text not null default 'free'
check (license_plan in ('free', 'premium', 'business'));
```

Opcion mas completa:

```sql
create table if not exists public.user_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
```

Recomendacion: usar `user_subscriptions` si se piensa conectar pagos, renovaciones, pruebas gratis o historial comercial.
