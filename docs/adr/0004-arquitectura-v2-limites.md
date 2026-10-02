# ADR 0004: Límites de plataforma y módulos

## Contexto

El monolito modular necesita una frontera verificable entre capacidades técnicas compartidas y reglas de negocio. La API ahora separa el núcleo técnico en `src/platform/` y los módulos de negocio en `src/modules/`.

## Decisión

La API evolucionará hacia `src/platform/` para el núcleo técnico y `src/modules/` para los módulos de negocio. Cada módulo tendrá un único `index.ts` público que expondrá su servicio y tipos de eventos. El acceso a modelos y repositorios permanecerá privado al módulo.

El aislamiento de tenant, los eventos outbox, la máquina de estados, la configuración de impuestos, los proveedores de timbrado/almacenamiento y los permisos de tres niveles forman parte de los contratos arquitectónicos del sistema.

## Consecuencias

- Se pueden verificar límites de dependencias automáticamente cuando se agregue dependency-cruiser.
- El núcleo técnico se mantiene en `src/platform/`; no se conservará un alias paralelo `src/core/`.
- Los módulos deben documentar sus eventos, permisos y dependencias públicas.
