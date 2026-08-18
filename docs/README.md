# Documentación de MotoCare

## Propósito

Esta carpeta reúne la fuente oficial versionada para producto, arquitectura, experiencia, aspectos legales y calidad de MotoCare. Está dirigida a desarrollo, producto, QA y colaboradores.

## Índice general

- [Administración](00-administracion/README.md): planificación, decisiones y versiones.
- [Producto](01-producto/README.md): visión, alcance y modelo de negocio.
- [Arquitectura](02-arquitectura/README.md): solución técnica, datos y seguridad.
- [UI/UX](03-ui-ux/README.md): flujos y wireframes.
- [Legal](04-legal/README.md): borradores sujetos a revisión jurídica.
- [Branding](05-branding/README.md): identidad visual y verbal.
- [Rutas](06-rutas/README.md): dominio de rutas.
- [Talleres](07-talleres/README.md): futura relación con talleres.
- [API](08-api/README.md): servicios comprobados y propuestas.
- [Testing](09-testing/README.md): estrategia, casos y publicación.
- [RFC](rfc/README.md): propuestas de cambio relevantes.

Los manuales y documentos históricos existentes permanecen disponibles en esta carpeta y deberán migrarse gradualmente a la taxonomía anterior sin perder información.

## Convenciones

Cada documento indica estado, responsable y cambios. Estados permitidos: **Borrador**, **En revisión**, **Aprobado** y **Obsoleto**. La versión documental usa `MAYOR.MENOR`: incrementar MAYOR ante cambios incompatibles o de política y MENOR ante aclaraciones o ampliaciones.

Para actualizar un documento, modifique su contenido, fecha, versión e historial en el mismo cambio. Registre decisiones vinculantes en [decisiones.md](00-administracion/decisiones.md) con identificador `DEC-NNN`. Cree un RFC copiando la estructura descrita en [rfc/README.md](rfc/README.md), asígnele el siguiente consecutivo y manténgalo como `Propuesto` hasta su aprobación.

Responsable: Equipo MotoCare
