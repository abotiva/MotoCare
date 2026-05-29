# Manual de Usuario - MotoCare

Documento vivo para registrar el uso de las funciones principales del MVP.

## Inicio

El modulo **Inicio** funciona como tablero principal del motero.

Funciones disponibles:

- ver resumen de motos registradas
- ver pendientes activos
- ver cantidad de rutas creadas
- ver actividad de comunidad
- ver moto principal
- ver pendientes importantes
- ver avance de perfil
- ver rutas recientes
- acceder rapidamente a registrar servicio, crear ruta, Mi moto y Mi perfil

La seccion **Comunidad** queda separada como feed social.

## Mi moto

El modulo **Mi moto** permite llevar la hoja de vida basica de una motocicleta.

Funciones disponibles:

- registrar una moto
- editar datos de la moto
- subir foto
- actualizar kilometraje
- registrar servicios
- crear recordatorios por kilometraje
- completar pendientes
- subir documentos

## Crear recordatorio por kilometraje

Desde **Mi moto**, el usuario puede crear un pendiente usando **Nuevo por km** o **Crear recordatorio km**.

El formulario muestra:

- mantenimiento sugerido
- descripcion de la sugerencia
- kilometraje recomendado
- titulo del recordatorio
- kilometraje objetivo editable
- fecha opcional

La sugerencia llena automaticamente el kilometraje objetivo, pero el usuario puede cambiarlo antes de guardar.

## Editar un pendiente

Cada pendiente tiene la opcion **Editar**.

Desde esa ventana se puede cambiar:

- titulo
- kilometraje objetivo
- fecha opcional
- sugerencia base

Esto sirve cuando el usuario quiere ajustar el kilometraje recomendado a su uso real.

## Cancelar un pendiente

Cada pendiente tiene la opcion **Cancelar**.

Sirve para ocultar pendientes que ya no aplican, por ejemplo un mantenimiento registrado por error o un recordatorio que el usuario decide no seguir.

## Completar un pendiente

Al presionar **Completar**, la app solicita:

- descripcion de la accion
- kilometraje actual
- fecha de la actividad
- proximo ajuste en kilometros
- fecha proxima opcional
- notas

Al guardar, el pendiente queda completado, se crea un registro en el historial y se puede programar automaticamente el siguiente pendiente.

## Actualizar kilometraje

El boton **Actualizar km** permite cambiar rapidamente el kilometraje de la moto sin editar toda la ficha.

La app muestra:

- kilometraje actual
- nuevo kilometraje
- alerta si algun pendiente queda vencido con el nuevo valor

El nuevo kilometraje no debe ser menor al kilometraje actual.

## Registrar servicio

El boton **Registrar servicio** guarda una actividad en el historial de mantenimiento.

El formulario permite:

- elegir un mantenimiento sugerido desde el catalogo
- editar manualmente el tipo de servicio
- definir fecha
- registrar kilometraje
- registrar costo
- definir kilometraje o fecha para el proximo servicio
- agregar notas

La sugerencia llena automaticamente el tipo de servicio, pero el usuario puede ajustarlo antes de guardar.
Los valores del proximo servicio vienen sugeridos por el catalogo, pero tambien se pueden editar o dejar vacios.

## Ver detalle del historial

En la pestana **Historial**, cada mantenimiento registrado tiene la opcion **Ver detalle**.

El detalle muestra:

- tipo de servicio
- fecha
- kilometraje
- costo
- fecha de registro
- notas

## Notificaciones

La app muestra notificaciones breves despues de acciones importantes.

Ejemplos:

- moto agregada o actualizada
- servicio registrado
- recordatorio creado o actualizado
- pendiente completado
- kilometraje actualizado
- foto o documento cargado
- pendiente cancelado
- documento eliminado

Si algo falla, la app muestra una alerta con una explicacion corta y conserva el mensaje tecnico para poder revisarlo.

## Eliminar documentos

En la pestana **Documentos**, los documentos cargados tienen opcion **Eliminar**.

La app pide confirmacion antes de borrar el archivo.

## Mi perfil

El modulo **Mi perfil** permite administrar la informacion visible del usuario.

Funciones disponibles:

- ver nombre, usuario, ciudad y tipo de motero
- editar informacion basica
- escoger moto principal
- agregar bio corta
- agregar enlace social
- subir foto de perfil
- ver estadisticas basicas
- ver moto principal
- ver rutas recientes
- abrir el modulo de rutas desde el perfil

La foto de perfil se guarda en Supabase Storage y la informacion se actualiza en la tabla `profiles`.

## Rutas

El modulo **Rutas** permite crear rutas manuales sin usar GPS ni mapas pagos en esta fase del MVP.

Funciones disponibles:

- crear ruta
- definir origen y destino
- registrar distancia estimada
- registrar duracion estimada
- definir fecha de inicio y fecha final de la ruta
- guardar como privada o comunidad
- definir estado: planeada, en curso o realizada
- generar notificaciones internas para rutas planeadas con fecha de inicio
- recibir alerta cuando una ruta en curso ya paso su fecha final
- ver mis rutas
- ver rutas compartidas por la comunidad
- ver rutas compartidas por otros moteros
- ver detalle de una ruta
- editar una ruta propia
- eliminar una ruta propia
- cambiar una ruta propia entre privada y comunidad
- cambiar el estado de una ruta propia

## Comunidad

El modulo **Comunidad** permite publicar mensajes cortos para otros moteros.

Funciones disponibles:

- escribir una publicacion de texto
- adjuntar una ruta propia a una publicacion
- adjuntar una imagen a una publicacion
- adjuntar varias imagenes a una publicacion
- previsualizar y quitar la imagen antes de publicar
- editar una publicacion propia
- eliminar una publicacion propia
- ver publicaciones recientes
- identificar autor, usuario y ciudad cuando esten disponibles
- ver publicaciones propias dentro del feed
- ver tarjetas de rutas publicadas dentro del feed
- dar y quitar **Me gusta**
- ver cantidad de likes
- abrir comentarios por publicacion
- escribir comentarios
- ver cantidad de comentarios
- usar la pestana **Club privado** para mensajes internos de los clubes a los que pertenece

Si se adjunta una ruta privada a una publicacion, la app la marca como visible para comunidad.

Las imagenes de publicaciones aceptan archivos de imagen de hasta 5 MB cada una. En esta version se pueden adjuntar hasta 6 imagenes por publicacion.

## Clubes

El modulo **Clubes** permite crear y administrar clubes moteros.

Funciones disponibles:

- crear un club
- editar nombre, ciudad y descripcion
- subir o cambiar imagen del club
- invitar miembros por nombre de usuario
- sacar miembros del club
- ver miembros y rol dentro del club
- ver en Mi perfil los clubes a los que pertenece el usuario
- publicar mensajes privados del club desde Comunidad

En esta version, el fundador del club administra miembros. Los mensajes privados del club solo se cargan para usuarios que pertenecen al club.

## Explorar

El modulo **Explorar** permite descubrir contenido compartido por la comunidad.

Funciones disponibles:

- buscar rutas publicas por nombre, origen, destino, ciudad o motero
- ver rutas marcadas como comunidad
- ver autor de cada ruta compartida
- guardar rutas para despues
- quitar rutas guardadas
- consultar la pestana de rutas guardadas
- ver publicaciones recientes
- ver publicaciones que tienen una ruta adjunta
- consultar un resumen de actividad comunitaria

Explorar solo muestra contenido publico o visible para comunidad.

## Ajustes

El modulo **Ajustes** permite revisar informacion de cuenta y configurar preferencias basicas del MVP.

Funciones disponibles:

- ver resumen de perfil
- abrir Mi perfil, Mi moto, Rutas y Explorar
- activar o desactivar preferencias de notificaciones
- activar o desactivar perfil visible
- solicitar correo para cambio de contrasena
- cerrar sesion
- ver informacion tecnica basica del proyecto

Las preferencias se guardan por ahora en el navegador del usuario. Mas adelante pueden moverse a Supabase si se requiere sincronizarlas entre dispositivos.
