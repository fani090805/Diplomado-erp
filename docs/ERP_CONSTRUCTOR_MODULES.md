# DESCRIPCIÓN FUNCIONAL DE MÓDULOS: ERP CONSTRUCTOR (Tec[ode])

Este documento detalla la funcionalidad operativa, flujo de trabajo y mapeo de datos de cada módulo del sistema **ERP Constructor** bajo la marca **Tec[ode]**.

---

## 1. MÓDULO DE AUTENTICACIÓN Y SEGURIDAD

- **Objetivo**: Garantizar el acceso seguro de usuarios según su rol y empresa asignada.
- **Marca e Identidad**: Muestra el logo vector **Tec[ode]** con el título **ERP Constructor**.
- **Funcionalidades**:
  - Inicio de sesión con correo electrónico y contraseña.
  - Validación de credenciales contra la API REST de producción (`/auth/login`).
  - Rotación automática de tokens JWT de acceso (15 min) y tokens de refresco (7 días) mediante `TokenAuthenticator` e `AuthInterceptor`.
  - Almacenamiento encriptado de sesión en hardware mediante **Android Keystore** (`EncryptedSharedPreferences`).
  - Cierre de sesión global (`/auth/logout`) con invalidación de sesión en servidor.

---

## 2. DASHBOARD EJECUTIVO DE CONSTRUCCIÓN

- **Objetivo**: Ofrecer una visión general en tiempo real del estado de las obras y finanzas de la empresa constructora.
- **Indicadores Clave (KPIs)**:
  - **Obras Activas / En Proceso**: Número de proyectos de construcción en ejecución.
  - **Presupuesto Total vs. Ejecutado**: Comparativa global de presupuesto asignado frente a gastos reales acumulados.
  - **Avance Financiero %**: Porcentaje de ejecución presupuestaria.
  - **Alertas de Stock Bajo en Materiales**: Cantidad de materiales con existencia en/bajo el stock mínimo.
  - **Órdenes de Compra Pendientes**: Compras en estado `DRAFT` pendientes de aprobación.
- **Acciones Rápidas**:
  - `+ Nueva Obra`, `+ Solicitar Material`, `+ Orden de Compra`, `+ Registrar Gasto`.

---

## 3. MÓDULO "MIS OBRAS" (PROYECTOS DE CONSTRUCCIÓN)

- **Objetivo**: Gestionar el ciclo de vida de los proyectos de construcción.
- **Vista Principal ("Mis Obras")**: Tarjetas de obras con nombre, cliente, ubicación, presupuesto, monto ejecutado, barra de progreso y estado (`PLANEADA`, `EN_PROCESO`, `PAUSADA`, `FINALIZADA`, `CANCELADA`).
- **Vista "Detalle de Obra" (Centro de Control)**:
  - **Resumen**: Datos generales, cliente contratante, responsable y fechas.
  - **Centros de Costo**: Partidas presupuestarias asignadas a la obra.
  - **Materiales**: Insumos consumidos y disponibles para la obra.
  - **Compras**: Órdenes de compra vinculadas a la obra.
  - **Gastos**: Erogaciones registradas directas a la obra.
  - **Documentos**: Expediente digital con todos los documentos asociados.

---

## 4. CENTROS DE COSTO

- **Objetivo**: Controlar la distribución del presupuesto de cada obra por categorías de gasto.
- **Partidas Tipo**:
  - Materiales de construcción.
  - Mano de obra y nómina.
  - Maquinaria y equipo.
  - Fletes y transporte.
  - Subcontratos.
  - Gastos indirectos de obra.
- **Métricas**: Presupuesto asignado, gasto acumulado, disponible y porcentaje de ejecución por partida.

---

## 5. CATÁLOGO DE MATERIALES DE CONSTRUCCIÓN

- **Objetivo**: Administrar el catálogo maestro de insumos, herramientas y materiales.
- **Campos**:
  - `SKU`: Código único de material por empresa (ej. `MAT-CEM-01`).
  - `Nombre`: Descripción del material (ej. Cemento Gris 50 kg, Varilla 3/8").
  - `Categoría`, `Marca`, `Unidad de Medida` (Saco, Tonelada, Pieza, Metro).
  - `Trazabilidad`: Indicador de control por Lote o Número de Serie.
  - `Stock Mínimo / Máximo`: Umbrales para alertas automáticas de reabastecimiento.

---

## 6. INVENTARIO Y ALMACENES DE OBRA

- **Objetivo**: Controlar la existencia física de materiales en las bodegas centrales y almacenes de obra.
- **Funcionalidades**:
  - Consultar stock de materiales por almacén/bodega.
  - Registrar **Entradas de Material**: Inserción atómica de stock por compras o transferencias.
  - Registrar **Salidas de Material**: Salidas condicionales atómicas para consumo en obra con verificación de saldo.
  - Registrar **Transferencias entre Bodegas**: Traspaso seguro de materiales entre la bodega central y el almacén de una obra.
  - **Inventarios Físicos (Conteos)**: Levantamiento de recuentos físicos con conciliación automática de lotes/series y ajustes inmutables.

---

## 7. COMPRAS PARA OBRA Y PROVEEDORES

- **Objetivo**: Gestionar el aprovisionamiento de materiales e insumos con proveedores calificados.
- **Proveedores**: Registro de razón social, RFC/NIF, contacto, teléfono, correo y materiales suministrados.
- **Órdenes de Compra (`PO-XXXXXX`)**:
  - Generación de órdenes de compra vinculadas a una Obra, Centro de Costo y Proveedor.
  - Flujo de Aprobación: Estado `DRAFT` → Al ser `APPROVED` por el residente/gerente, genera automáticamente la **Entrada de Materiales al Inventario** de la obra.

---

## 8. CLIENTES Y CONTRATOS (VENTAS)

- **Objetivo**: Administrar la relación con desarrolladoras, instituciones y clientes contratantes de obras.
- **Pedidos / Estimaciones de Venta (`SO-XXXXXX`)**:
  - Registro de contratos, estimaciones y servicios de construcción.
  - Al ser `APPROVED`, descuenta materiales reservando el inventario correspondiente.

---

## 9. FINANZAS Y GASTOS DE OBRA

- **Objetivo**: Registrar y fiscalizar todos los movimientos monetarios de la empresa constructora.
- **Cuentas Financieras**: Control de saldos en Cuentas Bancarias y Cajas Chicas de Obra (con escrituras optimistas atómicas).
- **Gastos (`EXP-XXXXXX`)**: Registro **append-only** de egresos vinculados a una Obra, Centro de Costo, Proveedor y Cuenta. Admite anulación contable `void`.
- **Ingresos (`INC-XXXXXX`)**: Registro **append-only** de anticipos, estimaciones cobradas e ingresos de obra.

---

## 10. VISOR DE DOCUMENTOS Y AUDITORÍA

- **Objetivo**: Ofrecer trazabilidad completa sobre el historial de operaciones ("¿De dónde viene este movimiento?").
- **Visor de Documentos**: Búsqueda y filtrado transversal de documentos (Órdenes de Compra, Pedidos, Gastos, Ingresos, Movimientos de Almacén) con estados y responsables.
- **Bitácora de Auditoría**: Registro inmutable de cada acción realizada en el sistema (quién, cuándo, qué módulo, qué documento y desde qué dirección IP).

---

## 11. REPORTES Y ANALÍTICA DE CONSTRUCCIÓN

- **Objetivo**: Generar reportes gerenciales para el seguimiento de la constructora.
- **Tipos de Reportes**:
  - **Reporte por Obra**: Presupuesto vs. Gastos reales y nivel de ejecución.
  - **Reporte por Centro de Costo**: Desviaciones presupuestarias por partida.
  - **Kardex y Valorización de Inventario**: Consumo de materiales valorizado a costo promedio.
  - **Exportación de Datos**: Generación de archivos CSV compatibles con Excel/BI.
