# Manual de Administrador - MotoCare

Documento vivo para registrar configuraciones, decisiones operativas y procesos internos del MVP.

## Inicio

El modulo **Inicio** es el tablero operativo del usuario.

Consume datos de:

- `motorcycles`
- `reminders`
- `routes`
- `posts`
- `profiles`
- `notifications`

No reemplaza a Comunidad. Comunidad queda como feed social y se renderiza desde `Community.tsx`.

## Catalogo de mantenimientos sugeridos

Los mantenimientos sugeridos se administran por ahora directamente desde Supabase, en la tabla:

`maintenance_suggestions`

Esta tabla alimenta el selector del formulario **Nuevo recordatorio por kilometraje** en el modulo **Mi moto**.

### Campos principales

- `code`: identificador interno unico. Ejemplo: `oil_change`.
- `name`: nombre visible para el usuario. Ejemplo: `Cambio de aceite`.
- `category`: categoria del mantenimiento. Ejemplo: `motor`, `seguridad`, `transmision`.
- `description`: descripcion que aparece debajo del selector en la app.
- `recommended_interval_km`: kilometraje sugerido para el proximo mantenimiento.
- `recommended_interval_days`: dias sugeridos para el proximo mantenimiento.
- `sort_order`: orden de aparicion en el selector.
- `is_active`: controla si la sugerencia aparece o no en la app.

### Como editar una sugerencia

1. Entrar a Supabase.
2. Ir a **Table Editor**.
3. Abrir la tabla `maintenance_suggestions`.
4. Editar la fila deseada, por ejemplo `oil_change`.
5. Cambiar `recommended_interval_km`, `description`, `name` u otro campo necesario.
6. Guardar.

La app usa estos valores para llenar automaticamente el titulo, kilometraje objetivo y fecha opcional del recordatorio. El usuario puede editar manualmente el kilometraje antes de crear el pendiente.

El mismo catalogo tambien alimenta el formulario **Registrar servicio**. En ese caso, la sugerencia llena automaticamente el tipo de servicio y propone el proximo kilometraje o fecha de servicio. El usuario puede editar esos valores antes de guardar.

## Recordatorios por kilometraje

Los recordatorios se guardan en la tabla:

`reminders`

Campos relevantes:

- `title`: nombre del pendiente.
- `due_mileage`: kilometraje objetivo.
- `due_date`: fecha opcional.
- `status`: estado del pendiente: `pending`, `done`, `dismissed`.
- `completed_at`: fecha/hora en que se marco como completado.

## Completar pendientes

Cuando un usuario completa un pendiente desde **Mi moto**, la app:

1. Abre una ventana emergente de confirmacion.
2. Solicita descripcion de la accion, kilometraje actual, fecha de actividad, proximo ajuste y notas.
3. Marca el pendiente actual como `done`.
4. Crea un registro en `maintenance_records`.
5. Crea un nuevo recordatorio si se definio proximo kilometraje o fecha.
6. Actualiza el kilometraje de la moto si el valor registrado es mayor al actual.

## Kilometraje de la moto

El kilometraje principal de cada moto esta en:

`motorcycles.mileage`

La app permite actualizarlo desde el boton **Actualizar km** en el modulo **Mi moto**. Al cambiarlo, los pendientes por kilometraje se recalculan visualmente para mostrar si estan vencidos o cuantos kilometros faltan.

## Notificaciones en Mi moto

El modulo **Mi moto** usa notificaciones tipo toast para confirmar acciones y mostrar errores.

Acciones con confirmacion:

- crear o editar moto
- registrar servicio
- crear o editar recordatorio
- completar pendiente
- cancelar pendiente
- actualizar kilometraje
- subir foto
- subir documento
- eliminar documento

Los errores muestran una explicacion corta y el detalle tecnico de Supabase cuando aplica.

## Cierre funcional de Mi moto

Antes de pasar al modulo **Mi perfil**, se agregaron validaciones y acciones de cierre:

- no permitir kilometrajes negativos
- no permitir proximo kilometraje menor al kilometraje del servicio
- cancelar pendientes que ya no aplican
- eliminar documentos cargados por error

Para que la eliminacion de documentos funcione en Supabase Storage, debe existir la politica `documents_own_delete`.
Si la base de datos ya estaba creada antes de esta mejora, ejecutar:

`supabase/storage_delete_policy_migration.sql`

## Mi perfil

El modulo **Mi perfil** usa la tabla `profiles`.

Campos editables desde la app:

- `full_name`
- `username`
- `city`
- `rider_type`
- `bio`
- `social_url`
- `avatar_url`
- `primary_motorcycle_id`
- `is_public`

La foto de perfil se sube al bucket publico `motocare-public` y luego se guarda la URL publica en `profiles.avatar_url`.
La moto principal se guarda en `profiles.primary_motorcycle_id`.

Si la base de datos ya estaba creada antes de esta mejora, ejecutar:

`supabase/profile_primary_motorcycle_migration.sql`

Para habilitar bio y enlace social en bases existentes, ejecutar:

`supabase/profile_bio_social_migration.sql`

Para habilitar privacidad de perfil e invitaciones aprobadas a clubes en bases existentes, ejecutar:

`supabase/profile_privacy_club_invites_migration.sql`

Para habilitar presencia publica en Comunidad, ejecutar:

`supabase/profile_presence_migration.sql`

Esta migracion agrega `profiles.last_seen_at`. La app actualiza ese campo periodicamente mientras el usuario autenticado navega. Comunidad considera conectado a un perfil publico si `last_seen_at` esta dentro de los ultimos 5 minutos.

## Rutas

El modulo **Rutas** usa la tabla `routes`.

Campos principales:

- `owner_id`
- `title`
- `origin`
- `destination`
- `distance_km`
- `duration_minutes`
- `start_date`
- `end_date`
- `visibility`
- `status`

La visibilidad puede ser:

- `private`: solo el usuario la ve en sus rutas.
- `community`: aparece en el listado de comunidad.

El estado puede ser:

- `planned`: ruta planeada.
- `in_progress`: ruta en curso.
- `completed`: ruta realizada.

La primera version es manual. No usa GPS, Mapbox ni costos de mapas.

Si la base de datos ya estaba creada antes de esta mejora, ejecutar:

`supabase/route_status_migration.sql`

Para habilitar fecha de inicio y fecha final en bases existentes, ejecutar:

`supabase/route_dates_migration.sql`

## Notificaciones

La tabla `notifications` guarda avisos internos del MVP.

Campos principales:

- `user_id`: usuario que recibe la notificacion.
- `type`: tipo de notificacion. En esta version existen `route_planned` y `route_overdue`.
- `title`: titulo corto.
- `message`: descripcion visible para el usuario.
- `route_id`: ruta relacionada, cuando aplica.
- `scheduled_for`: fecha y hora en la que la notificacion debe contar como activa.
- `read_at`: fecha en la que el usuario la marco como leida.

Cuando una ruta queda en estado `planned` y tiene `start_date`, la app genera una notificacion futura con `scheduled_for` siete dias antes de la fecha inicial. Desde ese momento la notificacion aparece en Inicio y en el contador de la campana.

Cuando una ruta queda en estado `in_progress` y su `end_date` ya paso, la app genera una alerta `route_overdue` para recordar que la ruta debe cerrarse, actualizarse o marcarse como realizada.

Si la ruta se edita o cambia de estado, la app elimina las notificaciones anteriores de esa ruta y las vuelve a crear segun los datos actuales.

Para habilitar notificaciones en bases existentes, ejecutar:

`supabase/notifications_migration.sql`

En el modulo **Rutas**, la pestana de comunidad lista rutas compartidas por otros usuarios. Las rutas propias compartidas siguen apareciendo en **Mis rutas**.

Las rutas propias pueden editarse o eliminarse desde el modulo **Rutas**. Si una ruta se elimina, las publicaciones relacionadas conservan el post y dejan la referencia a la ruta en null por la regla `on delete set null`.

## Comunidad

El modulo **Comunidad** usa la tabla `posts`.

Campos principales:

- `author_id`: usuario que crea la publicacion.
- `content`: texto visible en el feed.
- `image_url`: URL publica de la imagen adjunta a la publicacion.
- `route_id`: reservado para relacionar una publicacion con una ruta.
- `created_at`: fecha de creacion.

La primera version permite crear y listar publicaciones de texto. Tambien permite adjuntar una ruta propia usando `posts.route_id`.

Si el usuario adjunta una ruta privada, la app actualiza `routes.visibility` a `community` antes de crear la publicacion.

Los likes se guardan en `post_likes` usando la llave compuesta `post_id` + `user_id`.

Los comentarios se guardan en `post_comments` y se muestran con nombre, usuario y avatar del autor cuando esten disponibles.

La carga del feed consulta publicaciones, rutas adjuntas, likes y comentarios.

Las imagenes de publicaciones se suben al bucket publico `motocare-public`, dentro de la carpeta `{user_id}/posts/`, y la URL publica se guarda en `posts.image_url`.

Para multiples imagenes por publicacion se usa la tabla `post_images`.

Campos principales:

- `post_id`: publicacion asociada.
- `owner_id`: usuario propietario.
- `image_url`: URL publica de la imagen.
- `sort_order`: orden de visualizacion.

Para habilitar multiples imagenes en bases existentes, ejecutar:

`supabase/post_images_migration.sql`

## Clubes

El modulo **Clubes** usa las tablas `clubs`, `club_members` y `club_posts`.

Campos principales de `clubs`:

- `owner_id`: usuario fundador.
- `name`: nombre visible del club.
- `description`: descripcion del club.
- `city`: ciudad base.
- `image_url`: imagen publica del club en Supabase Storage.

Campos principales de `club_members`:

- `club_id`: club relacionado.
- `user_id`: perfil del miembro.
- `role`: `owner`, `admin` o `member`.

Campos principales de `club_posts`:

- `club_id`: club donde se publica.
- `author_id`: usuario que escribe el mensaje.
- `content`: texto privado del club.

La primera version permite al fundador crear el club, editar informacion, subir imagen, invitar miembros por `profiles.username` y retirar miembros no fundadores.

Con privacidad de perfil habilitada:

- si el perfil invitado es publico, aparece en el buscador de invitaciones mientras se escribe;
- si el perfil invitado es privado, debe buscarse por usuario exacto;
- toda invitacion crea un registro en `club_invitations` y una notificacion `club_invite`;
- las invitaciones pendientes se muestran en Clubes, debajo de la lista de miembros;
- el usuario invitado debe aprobar o rechazar la invitacion desde **Inicio**;
- al aprobar, la app inserta el registro en `club_members`;
- al rechazar, solo se marca la invitacion como `declined` y la notificacion como leida.

Los mensajes privados del club se muestran en la pestana **Club privado** de Comunidad. La politica RLS de `club_posts` permite leer y publicar solo a miembros del club.

Para habilitar clubes en bases existentes, ejecutar:

`supabase/clubs_migration.sql`

## Explorar

El modulo **Explorar** consume datos reales de Supabase:

- `routes` con `visibility = community`
- `profiles` del propietario de cada ruta
- `posts`
- rutas adjuntas por `posts.route_id`
- rutas guardadas por `saved_routes`

La busqueda se ejecuta en frontend sobre los registros cargados inicialmente. Para una comunidad grande, se recomienda mover la busqueda a consultas paginadas en Supabase.

Para habilitar guardados en bases existentes, ejecutar:

`supabase/saved_routes_migration.sql`

## Google Maps

La integracion inicial de mapas usa Google Maps Embed en el detalle de rutas, mediante la variable:

`VITE_GOOGLE_MAPS_EMBED_KEY`

Nota para publicacion: esta clave debe quedar restringida en Google Cloud a la API **Maps Embed API** y al dominio real de MotoCare. Para desarrollo local puede permitir `http://127.0.0.1:*` o `http://localhost:*`.

## Ajustes

El modulo **Ajustes** muestra datos reales del usuario autenticado desde `profiles` y `auth.users`.

Las preferencias de notificaciones se guardan temporalmente en `localStorage` bajo la llave `motocare_settings`.

La visibilidad publica/privada del perfil ya no es solo una preferencia local: se guarda en `profiles.is_public`.

Esto evita crear tablas prematuramente mientras se valida que ajustes necesita realmente el usuario. Si se requiere sincronizacion entre dispositivos, crear una tabla `user_settings` con `user_id`, claves booleanas y fecha de actualizacion.

## Modulo de administracion

El modulo interno **Administracion** vive en:

`/app/admin`

Solo aparece en el menu cuando el usuario autenticado existe en la tabla:

`app_admins`

Para habilitar el modulo en bases existentes, ejecutar:

`supabase/admin_module_migration.sql`

Luego agregar manualmente el primer administrador desde Supabase SQL Editor:

```sql
insert into public.app_admins (user_id, role)
values ('ID_DEL_USUARIO', 'owner')
on conflict (user_id) do update set role = excluded.role;
```

El `ID_DEL_USUARIO` corresponde a `profiles.id` del usuario que tendra acceso administrativo.

### Privacidad en administracion

El panel admin no muestra correos ni datos privados de autenticacion.

Para usuarios con `profiles.is_public = false`, el panel muestra:

- nombre enmascarado como `Perfil privado`
- usuario operativo tipo `privado-xxxxxxxx`
- ciudad y tipo de motero ocultos
- metricas agregadas como motos, rutas, publicaciones y clubes

Para clubes, si el fundador tiene perfil privado, el panel muestra `Fundador privado`.

### Vistas iniciales

El panel incluye:

- resumen general de usuarios, motos, rutas, publicaciones, clubes e invitaciones
- listado de usuarios con datos enmascarados cuando aplica
- listado de clubes con metricas
- catalogo de mantenimientos sugeridos

Las consultas se sirven por funciones RPC `security definer` que validan `public.is_current_user_admin()` antes de devolver datos.

## Pendiente futuro: modulo admin

La primera version del modulo admin es de lectura operativa. Mas adelante se puede ampliar para administrar:

- mantenimientos sugeridos
- categorias
- intervalos recomendados
- textos visibles en la app
- tipos de documento
- otros listados configurables
