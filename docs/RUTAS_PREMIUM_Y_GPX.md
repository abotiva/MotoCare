# Rutas Premium y archivos GPX

Esta guía describe el flujo vigente para publicar, entregar y retirar rutas Premium en MotoCare.

## Regla comercial

- MotoCare puede seleccionar hasta **5 rutas o packs gratuitos por mes calendario**.
- El mes se calcula con la zona horaria `America/Bogota`.
- Una ruta gratuita exige una licencia `premium` o `business` activa para reclamarla.
- Las rutas que no formen parte del beneficio mensual pueden publicarse con un precio de venta.
- El límite de cinco se valida en PostgreSQL y no depende únicamente de la interfaz.
- Una ruta rechazada por moderación libera el cupo gratuito que había reservado.

El límite corresponde a la cantidad de rutas gratuitas ofrecidas por MotoCare durante el mes; no es un límite de cinco descargas por usuario.

## Publicar una ruta

Desde **Tienda > Crear publicación**:

1. Seleccionar la categoría **Rutas Premium** o **Packs**.
2. Completar título, descripción, ubicación e imágenes.
3. Adjuntar un archivo `.gpx` de máximo 10 MB.
4. Elegir una modalidad:
   - **Gratis para usuarios Premium este mes**: el precio se fuerza a cero.
   - **Venta**: desactivar la opción gratuita y asignar el precio en COP.
5. Guardar como borrador o enviar a revisión.

Los administradores pueden crear publicaciones sin depender de su licencia comercial. La publicación continúa pasando por las reglas de categoría, archivo y cupo mensual.

## Almacenamiento y descarga

- Los archivos se guardan en el bucket privado `premium-route-files`.
- La tabla `marketplace_route_files` relaciona una publicación con su GPX.
- No se guarda ni se entrega una URL pública permanente.
- Al descargar, la aplicación genera una URL firmada válida durante 60 segundos.
- Las políticas RLS permiten leer el archivo al vendedor, a un administrador o a un usuario con derecho vigente.

Una vez descargado físicamente en el teléfono o computador, MotoCare no puede borrar esa copia local. El vencimiento impide que el usuario vuelva a descargar el archivo desde la aplicación.

## Acceso mensual y vencimiento

Al reclamar una ruta gratuita se crea un registro en `premium_route_entitlements` con:

- `source = 'monthly-premium'`;
- `expires_at` igual al inicio del mes siguiente en hora de Bogotá.

Mientras el derecho está vigente, la ruta aparece en **Rutas Premium > Mis rutas** y permite descargar el GPX.

Al vencer:

- deja de aparecer en el listado activo;
- se bloquea la descarga;
- aparece un aviso de acceso vencido;
- el usuario puede ir a la tienda para comprarla y conservarla.

Los derechos con origen `purchase` o `admin` pueden mantenerse sin vencimiento (`expires_at = null`).

### Estado del flujo de compra

La estructura de datos admite accesos permanentes con origen `purchase`, pero la pasarela de pago todavía no está integrada. En la versión actual, el aviso de vencimiento lleva al usuario a la tienda. La futura confirmación de pago deberá crear o actualizar el derecho con `source = 'purchase'` y `expires_at = null`; esta operación no debe concederse desde el navegador sin verificar el pago.

## Tablas y funciones

| Recurso | Propósito |
| --- | --- |
| `marketplace_listings` | Publicación, precio y selección gratuita del mes |
| `premium_route_free_slots` | Libro de control del máximo de cinco rutas mensuales |
| `premium_route_entitlements` | Derecho de acceso por usuario y fecha de vencimiento |
| `marketplace_route_files` | Metadatos del GPX privado |
| `claim_premium_monthly_route(uuid)` | Valida licencia y concede el acceso mensual |
| `marketplace_effective_plan(uuid)` | Determina la licencia efectiva del usuario |

## Instalación en Supabase

En una base existente, ejecutar en este orden:

```text
supabase/marketplace_migration.sql
supabase/premium_routes_monthly_migration.sql
supabase/premium_route_gpx_expiry_migration.sql
```

La segunda migración crea el beneficio mensual y la tercera crea el bucket privado, las políticas de Storage, los metadatos GPX y el vencimiento.

## Operación mensual

Antes de publicar la selección del mes:

1. Confirmar que las rutas tengan descripción, imágenes y GPX válidos.
2. Marcar como gratuitas únicamente las seleccionadas para ese mes.
3. Enviar las publicaciones a revisión.
4. Verificar que no se excedan cinco cupos.
5. Aprobar y activar las publicaciones desde el flujo de moderación.

No es necesario ejecutar una tarea programada para retirar derechos: la aplicación y las políticas comparan `expires_at` con la hora actual.
