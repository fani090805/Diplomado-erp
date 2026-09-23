# ADR 0003: Dinero con Decimal128

## Contexto

Los cálculos financieros requieren precisión exacta y evitan errores de punto flotante.

## Decisión

Se usará Decimal128 en MongoDB y decimal.js en los cálculos de negocio y utilidades de dinero.

## Consecuencias

- Reducción de errores en montos y IVA.
- Consistencia con moneda y reportes.
- Mayor necesidad de convertir valores antes de serializar.
