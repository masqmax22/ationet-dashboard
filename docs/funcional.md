# Documentación funcional — ATIONet Dashboard

Dashboard interno para monitorear una red de estaciones de servicio sobre la
**API de ATIONet** (`api.ationet.com`). Presenta, en una sola pantalla con
navegación lateral, el estado financiero y operativo de la red: balance de
contratos, salud de los componentes, despachos (transacciones) por período,
estado de los sitios y reconciliación de combustible.

> Este documento describe **qué hace** el dashboard desde el punto de vista del
> usuario y del negocio, de dónde sale cada dato y cómo se calculan las
> métricas. Para instalación y despliegue, ver [`../README.md`](../README.md).

---

## 1. Conceptos y origen de los datos

Todos los datos provienen de la **API de ATIONet**. La app **no tiene base de
datos propia**: cada pantalla consulta la API en vivo (con caché corta en el
navegador).

- **Autenticación:** la app se loguea contra `POST /Token` con
  `grant_type=password` (usuario + contraseña) y una **entidad** (`entity`) que
  identifica la red: `{ Id, Name, Type }`. El token se cachea en memoria del
  servidor y se renueva automáticamente ~60 s antes de expirar.
- **Entidad / red:** definida por las variables `ATIONET_NETWORK_ID` (Id),
  `ATIONET_NETWORK_NAME` (Name) y `ATIONET_ENTITY_TYPE` (Type, por defecto `N`
  = network). Todo lo que se ve en el dashboard corresponde a **esa única red**.
- **Credenciales solo del lado servidor:** las llamadas a ATIONet se hacen desde
  las *API routes* de Next.js (`/api/...`), que actúan como proxy. El navegador
  nunca ve usuario, contraseña ni token.
- **Moneda:** los montos se muestran en **ARS** (peso argentino) y los formatos
  numéricos usan la configuración regional `es-AR`.

### Mapa de endpoints

| Ruta interna (navegador → Next.js) | Endpoint ATIONet | Usado por |
| --- | --- | --- |
| `GET /api/widgets/balance` | `GET /BalanceWidget` | KPIs de balance (Resumen) |
| `GET /api/widgets/health` | `GET /HealthWidget` | KPI de salud de red (Resumen) |
| `GET /api/widgets/liters` | `GET /LitersWidget` | Gráfico de despacho diario |
| `GET /api/transactions` | `GET /Transactions` | Listado y resúmenes de transacciones |
| `GET /api/sites` | `GET /Sites` | Grilla de sitios |
| `GET /api/reconciliation` | `GET /LitersWidget` + `GET /Transactions` | Tabla de reconciliación |
| `GET /api/tanks/deliveries` | `GET /Transactions` | Reservado para integración FMS (no usado en UI aún) |
| `GET /api/tanks/readings` | `GET /Sites` | Reservado para integración FMS (no usado en UI aún) |

---

## 2. Estructura general de la interfaz

La pantalla tiene tres zonas fijas:

- **Barra lateral (sidebar):** logo "ATIONet · Lab Services", menú de navegación
  (4 secciones) y, al pie, el usuario conectado con un indicador verde.
- **Barra superior (top bar):** título y subtítulo de la sección actual + los
  controles globales:
  - **Selector de rango de fechas** (`De` / `a`). Por defecto, **últimos 30
    días**. Afecta a las secciones que dependen del período (transacciones,
    reconciliación y la vista Resumen).
  - **Botón "Actualizar":** invalida y vuelve a pedir **todos** los datos
    (fuerza refresco inmediato, ignorando la caché).
  - **Campana de notificaciones:** presente visualmente, sin funcionalidad aún.
- **Contenido:** cambia según la sección seleccionada.

### Navegación — 4 secciones

| Sección | Qué muestra |
| --- | --- |
| **Resumen** (`overview`) | Vista general: estado de red + sitios + transacciones + reconciliación, en formato resumido. |
| **Transacciones** | Listado completo de despachos con filtros, búsqueda y paginación. |
| **Reconciliación** | Tabla de diferencias de volumen por combustible/tanque. |
| **Sitios** | Grilla de todas las estaciones de la red con su estado y actividad. |

### Comportamiento de datos (caché y refresco)

- Los datos se cachean en el navegador con **TanStack React Query**.
- **Tiempo de frescura** (`staleTime`): **5 minutos** en la mayoría de las
  consultas (2 minutos en el listado de transacciones). Dentro de ese lapso no
  se vuelve a pedir el dato salvo que se presione "Actualizar".
- **Reintentos:** hasta 2 reintentos automáticos ante error.
- **Estados de carga:** cada bloque muestra *skeletons* mientras carga y un
  cartel de error (rojo) si la API falla, con el detalle del error.

---

## 3. Sección **Resumen**

Subtítulo: *"Vista general de la red"*. Compuesta por cuatro bloques apilados.

### 3.1 Estado de la Red (4 tarjetas KPI)

Fuente: `/BalanceWidget` + `/HealthWidget`.

1. **Balance disponible total** — suma de `AvailableBalance` de todos los
   contratos en modo dinero ("Money"). Badge con la cantidad de contratos de
   dinero.
2. **Contrato principal** — primer contrato de la lista. Muestra su saldo
   (formateado como volumen o dinero según `CurrentAccountMode`) y los **días
   operativos restantes** (`RemainingOperatingDays`; si supera 9999 se muestra
   "Sin límite de días").
3. **Contratos en volumen** — cantidad de contratos en modo "Volume", con el
   detalle de sus códigos.
4. **Salud de la red** — se arma a partir de los `HealthItems`. Cada ítem tiene
   un `Status`:
   - `0` = **crítico** (rojo)
   - `1` = **alerta** (ámbar)
   - `2` = **OK** (verde)

   La tarjeta muestra "Saludable" si no hay problemas, o la cantidad de *issues*,
   con el badge resumido (ej. "2 críticos", "1 alerta", "OK") y hasta 2 mensajes
   de los problemas detectados.

### 3.2 Sitios (resumen)

Grilla con hasta **6 sitios** (ver sección 6 para el detalle del componente).

### 3.3 Transacciones (resumen)

Subtítulo con el rango activo (`dateFrom → dateTo`) y enlace **"Ver todo →"**
que lleva a la sección Transacciones. Muestra:

- **4 KPIs del período:**
  - Transacciones en el período (cantidad).
  - Volumen despachado (litros, formateado).
  - Total últimos 29 días (suma de la serie "Total" del `LitersWidget`).
  - Monto total del período (ARS).
- **Gráfico de área "Despacho diario"**: litros por combustible por día, a
  partir del `LitersWidget`. Dibuja una serie por categoría de combustible
  (excluye la categoría "Total") con la paleta ATIO. Tooltip con el detalle por
  combustible.

### 3.4 Reconciliación (resumen)

Enlace **"Ver detalle →"**. Muestra la misma tabla de reconciliación que la
sección dedicada (ver sección 5).

---

## 4. Sección **Transacciones**

Subtítulo: *"Listado completo de despachos"*. Fuente: `/Transactions`
(ordenado por fecha descendente). Es la vista operativa de consulta de
despachos.

### 4.1 Filtros (barra superior del listado)

- **Rango de fechas** `De` / `a` (propio de esta vista, independiente del global;
  por defecto últimos 30 días).
- **Búsqueda por código de autorización** (campo de texto; se aplica con Enter o
  botón "Buscar").
- **Filtro por Sitio** (desplegable; opciones derivadas de los resultados
  visibles).
- **Filtro por Combustible** (desplegable; ídem).
- **"Limpiar filtros"** restablece todo a los valores por defecto.

> Nota: las opciones de los desplegables de Sitio/Combustible se arman con los
> valores presentes en la **página actual** de resultados.

### 4.2 KPIs (sobre los resultados)

- **Total transacciones** — total global que informa la API (`TotalCount`).
- **Volumen · pág. actual** — suma de `FuelVolume` de la página visible.
- **Monto · pág. actual** — suma de `TransactionAmount` de la página visible.

### 4.3 Tabla de transacciones

Columnas: **Fecha/Hora · Sitio · Cód. Auth · Combustible · Volumen · Monto ·
PAN · Estado**.

- **PAN** (medio de pago) se muestra **enmascarado**: `****` + últimos 4 dígitos.
- **Estado**: badge "Aprobada" (verde) si `ResponseCode == "00"` o el mensaje
  contiene "aprov"/"approved"; de lo contrario "Rechazada"/mensaje (rojo).
- **Paginación:** 50 registros por página, con controles de página y el total
  de resultados.
- **Estado vacío:** mensaje contextual (sin resultados por filtros, o sin
  transacciones en el período) con sugerencia de ampliar el rango de fechas.

---

## 5. Sección **Reconciliación**

Subtítulo: *"Diferencias entre volumen esperado y actual"*. Fuente:
`/api/reconciliation` (combina `LitersWidget` + `Transactions` del período).

Compara el **volumen que debería haber en los tanques** (reconciliado) contra el
**volumen real medido**, para detectar faltantes/sobrantes de combustible.

### 5.1 Modelo de datos por fila

Cada fila representa un combustible de la red ("tanque" a nivel red). Campos:

| Campo | Significado |
| --- | --- |
| **Stock Inicial** | Volumen al inicio del período. *(requiere FMS)* |
| **Deliverys** | Ingresos/cargas de combustible al tanque. *(requiere FMS)* |
| **Descargas** | Volumen despachado (ventas). Sale del `LitersWidget`. |
| **Vol. Reconciliado** | `Stock Inicial + Deliverys − Descargas` (volumen esperado). |
| **Vol. Actual** | Volumen real medido por sonda. *(requiere FMS)* |
| **Diferencia** | `Vol. Actual − Vol. Reconciliado`. |
| **% Dif.** | `Diferencia / |Vol. Reconciliado| × 100`. |
| **Estado** | Semáforo según el % (ver abajo). |

### 5.2 Semáforo de estado

| Estado | Umbral (valor absoluto de % Dif.) |
| --- | --- |
| 🟢 **OK** | `< 0.5 %` |
| 🟡 **Alerta** | `0.5 % – 1 %` |
| 🔴 **Crítico** | `> 1 %` |
| ⚪ **Sin FMS** | sin datos de sonda disponibles |

Las filas se ordenan **por mayor desvío** (peores primero).

### 5.3 KPIs de la sección

- **Tanques monitoreados** — cantidad de filas (combustibles de la red).
- **Estado agregado** — críticos / en alerta / todos OK.
- **% Diferencia promedio** — promedio de `% Dif.` sobre las filas.
- **Diferencia total** — suma de las diferencias de volumen.

### 5.4 Limitación actual — FMS no integrado ⚠️

> **Importante:** Stock inicial, Deliverys y Vol. Actual requieren **sondas ATG
> conectadas a un FMS** (Fuel Management System). Mientras esa integración no
> exista, esas celdas muestran la etiqueta "FMS" y la reconciliación es
> **parcial**: solo se conoce el volumen despachado (Descargas). La tabla ya
> está construida con la estructura completa, lista para cuando se integre el
> FMS.

---

## 6. Sección **Sitios**

Subtítulo: *"Estado de estaciones en la red"*. Fuente: `/Sites` (hasta 200) +
transacciones de los últimos 30 días (`/Transactions`) para las métricas de
actividad.

### 6.1 Tarjeta de sitio (compacta)

- Ícono de estación (azul si activa, rojo si inactiva).
- Nombre completo (`FullName`) y nombre corto (`ShortName`).
- Badge **Activo / Inactivo** según `Active`.

### 6.2 Detalle expandible (al hacer clic)

- **Dirección** (calle, ciudad, provincia) y **país**.
- Estado operativo ("Operativo" / "Fuera de servicio").
- **4 mini-KPIs (últimos 30 días)**, calculados a partir de las transacciones:
  - Transacciones · 30d (cantidad).
  - Volumen · 30d (litros).
  - Última transacción (fecha).
  - Combustible principal (el de mayor volumen en el sitio).

Las métricas por sitio se obtienen agrupando las transacciones por `SiteId`
(con *fallback* a `SiteName`). Si un sitio no tiene transacciones en los últimos
30 días, se indica "Sin transacciones registradas".

### 6.3 Comportamiento de la grilla

- En **Resumen** se muestran hasta 6 sitios; en la sección **Sitios**, todos
  (con botón "Ver N sitios más" / "Ver menos").
- Aviso informativo fijo: la **telemetría de tanques en tiempo real** (nivel,
  temperatura) requiere integración **FMS (sondas ATG)**.

---

## 7. Sección **Configuración** (multi-cliente)

Subtítulo: *"Clientes / redes ATIONet y credenciales"*. Permite **apuntar el
dashboard a una red ATIONet u otra sin re-desplegar**, administrando varios
"perfiles de cliente".

### 7.1 Cómo funciona

- **Perfiles de cliente:** cada perfil guarda nombre, usuario, contraseña,
  Network ID, Network Name, Base URL y Tipo de entidad. Se almacenan en el
  **navegador** (localStorage) de cada equipo.
- **Activar un cliente:** al activarlo, las credenciales se **validan contra
  ATIONet** (login real) y, si son correctas, se guardan en una **cookie de
  sesión httpOnly**. Todas las API routes leen esa cookie, así que el dashboard
  pasa a mostrar los datos de ese cliente de inmediato (se recargan todas las
  consultas).
- **Fallback a entorno:** si no hay ningún perfil activo, se usan las variables
  de entorno del despliegue (la red por defecto). El botón **"Volver al
  default"** limpia la cookie y regresa a esa configuración.
- **Probar conexión:** valida un perfil contra ATIONet sin activarlo (útil para
  encontrar/confirmar el Network ID correcto).

### 7.2 Acciones disponibles

- Crear / editar / eliminar perfiles.
- Activar un perfil (cambia el cliente activo).
- Probar conexión.
- Volver a la configuración por defecto (entorno).

### 7.3 Consideraciones de seguridad ⚠️

- Los perfiles (incluida la contraseña) se guardan **solo en ese navegador**.
- La cookie de sesión del cliente activo es **httpOnly** (no accesible por
  scripts) y, en producción, `Secure` + `SameSite=Strict`. Expira a las 12 h.
- El dashboard **no tiene login propio**: cualquiera con la URL ve los datos del
  cliente activo. No conviene usarlo en un equipo compartido con personas que no
  deban acceder a esos datos.

### 7.4 Endpoints de sesión

| Ruta | Acción |
| --- | --- |
| `GET /api/session` | Devuelve la config activa (sin contraseña) y su origen (`cookie`/`env`). |
| `POST /api/session` | Valida un perfil; con `{test:true}` solo prueba, si no activa (setea la cookie). |
| `DELETE /api/session` | Limpia la sesión → vuelve al default de entorno. |

La resolución de credenciales por request está en
[`../src/lib/ationet/config.ts`](../src/lib/ationet/config.ts) (cookie → entorno),
y el token se cachea **por cliente** en [`../src/lib/ationet/auth.ts`](../src/lib/ationet/auth.ts).

---

## 8. Formato de valores

Definidos en [`../src/lib/utils.ts`](../src/lib/utils.ts):

- **Volumen** (`formatVolume`):
  - `≥ 1.000.000 L` → millones de litros, ej. `1,25 ML`
  - `≥ 1.000 L` → miles de litros, ej. `12,3 kL`
  - resto → litros, ej. `850 L`
- **Moneda** (`formatCurrency`): formato ARS sin decimales, ej. `$ 1.250.000`.
- **Porcentaje** (`formatPct`): 2 decimales con signo, ej. `+0,42%` / `-1,15%`.
- **Fechas**: ISO (`YYYY-MM-DD`) para parámetros de API; `es-AR` legible en la UI.

---

## 9. Limitaciones conocidas y pendientes

- **FMS no integrado:** la reconciliación completa y la telemetría de tanques
  (nivel/temperatura) dependen de sondas ATG conectadas a un FMS. Hoy solo se
  dispone del volumen despachado.
- **Sin login propio:** el dashboard no autentica usuarios; el acceso depende de
  quién tenga la URL (ver §7.3).
- **Moneda fija en ARS:** los montos se formatean siempre como pesos argentinos.
- **Notificaciones:** la campana de la barra superior es decorativa (sin lógica).
- **Endpoints `tanks/deliveries` y `tanks/readings`:** existen como preparación
  para la integración FMS, pero aún no alimentan ninguna vista.
- **Filtros de Sitio/Combustible en Transacciones:** se arman con los valores de
  la página visible, no con el catálogo completo.

---

## 10. Mapa rápido código ↔ función

| Función / pantalla | Componente | Hook de datos |
| --- | --- | --- |
| Shell, navegación, fechas, refresco | `DashboardShell` | — |
| Estado de la Red (KPIs) | `BalanceHealthBanner` | `useBalanceWidget`, `useHealthWidget` |
| Resumen de transacciones + gráfico | `TransactionSummary` | `useTransactionSummary`, `useLitersWidget` |
| Listado de transacciones | `TransactionList` | (fetch propio a `/api/transactions`) |
| Reconciliación | `ReconciliationTable` | `useReconciliation` |
| Grilla de sitios | `SiteStatusGrid` | `useSites`, `useSiteStats` |
| Tarjeta de sitio | `SiteStatusCard` | — |
| Configuración multi-cliente | `ClientConfig` | `/api/session` + `localStorage` |

Lógica de acceso a ATIONet: [`../src/lib/ationet/`](../src/lib/ationet/)
(`auth.ts`, `client.ts`, `transactions.ts`, `tanks.ts`, `types.ts`).
