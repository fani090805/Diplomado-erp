# Módulos de negocio

Cada módulo de negocio debe exponer únicamente su `index.ts` como API pública. Ese archivo exporta el servicio público del módulo y los tipos de eventos que otros módulos pueden consumir.

Los archivos internos (`model`, `repository`, `controller`, `routes`, `schemas` y lógica privada) no se importan desde otros módulos. La comunicación entre módulos ocurre mediante el servicio público o eventos.

Los módulos nuevos deben incluir documentación en `docs/modulos/<modulo>.md` y una prueba de aislamiento en `apps/api/test/tenant-isolation/`.
