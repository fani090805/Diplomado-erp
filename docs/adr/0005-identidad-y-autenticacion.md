# ADR 0005: Identidad global y selección del tenant

## Contexto

El inicio de sesión recibe correo y contraseña. El cliente no puede elegir el `tenantId`, y el token de acceso debe incluir el tenant resuelto por el servidor.

## Decisión provisional

- El correo identifica una cuenta única en todo el ERP.
- Una cuenta pertenece a un tenant y puede acceder a varias empresas dentro de ese tenant.
- El servidor obtiene el `tenantId` desde la identidad persistida y lo firma en los tokens.
- La colección de identidades puede consultarse por correo antes de establecer el contexto del tenant. No almacenará datos de negocio.

## Pendiente de QA

`TODO(QA): Confirmar si una persona debe pertenecer a más de un tenant. Si se requiere, el login necesitará una selección de tenant validada en el servidor antes de emitir el token; nunca se aceptará el tenant directamente del cliente.`
