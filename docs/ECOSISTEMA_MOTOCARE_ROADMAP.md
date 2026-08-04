# MotoCare como ecosistema para moteros

Principio rector:

> MotoCare cuida tu moto, te ayuda a encontrar la próxima ruta y te conecta con quienes comparten tu pasión.

## Capacidades activas

- Mi Garage: motos, mantenimientos, kilometraje, recordatorios, documentos, gastos y moto principal.
- Rutas: creación y edición propia, GPX, rutas públicas, detalle y rutas Premium. Free y Premium pueden guardar rutas comunitarias, administrarlas en Mis rutas y copiarlas como una ruta nueva.
- Comunidad: publicaciones, fotografías, comentarios, reacciones, rutas asociadas, actividad privada de clubes y personas.
- Clubes: creación según licencia, membresías por invitación, roles actuales (`owner`, `admin`, `member`), publicaciones y rutas del club.
- Seguridad: los datos de Mi Garage están separados de las publicaciones y solo se comparten mediante una acción explícita.
- Servicios: directorio con consulta para Free/Premium y publicaciones exclusivamente Business, sujetas a moderación. El perfil público incluye contacto, ubicación, mapa y enlace a una aplicación externa. Las compras y ventas directas están deshabilitadas.

## Evolución futura que requiere modelo de datos y permisos

Estas capacidades no se muestran como disponibles hasta contar con tablas, políticas RLS, interfaces y pruebas:

1. **Salidas programadas:** entidad separada de rutas y eventos; asistencia, cupos, lista de espera, visibilidad y confirmación al cancelar.
2. **Roles ampliados de club:** organizador y moderador, con permisos en interfaz y PostgreSQL; solicitudes de ingreso diferenciadas de invitaciones.
3. **Metadatos avanzados de rutas:** dificultad multidimensional, terreno, clima, combustible, cobertura, peligros, puntos de interés, calificaciones y reportes.
4. **Tipos de publicación y moderación:** experiencia, recomendación, pregunta, evento y alerta vial; reportes y bloqueo de usuarios.
5. **Privacidad ampliada:** perfil público, por clubes o privado; protección explícita de placa, documentos, gastos, historial y ubicación sensible.
6. **Notificaciones:** categorías nuevas, preferencias por usuario, deduplicación y límites de frecuencia.
7. **Productos de rutas:** separación entre ruta Premium digital, salida guiada y pack; sin cobros o licencias nuevas antes de revisar suscripciones.

## Orden sugerido

1. Salidas y asistencia.
2. Solicitudes y roles ampliados de clubes.
3. Clasificación y reportes de rutas.
4. Tipos de publicación y moderación.
5. Preferencias de notificaciones y privacidad.
