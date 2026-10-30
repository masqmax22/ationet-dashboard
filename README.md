# ATIONet Dashboard

Dashboard interno para monitorear la red de estaciones de servicio sobre la
**API de ATIONet** (`api.ationet.com`). Muestra balance y salud de la red,
transacciones/despachos por período, estado de sitios y reconciliación de
combustible.

Construido con **Next.js 16** (App Router, SSR), **React 19**, **TanStack
React Query**, **Tailwind CSS 4** y componentes estilo shadcn/ui.

> Las _API routes_ de Next.js (`src/app/api/...`) actúan como backend/proxy
> contra ATIONet, de modo que las credenciales viven solo del lado servidor y
> nunca llegan al navegador.

## Desarrollo local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar variables de entorno:

   ```bash
   cp .env.local.example .env.local
   # completá ATIONET_USERNAME, ATIONET_PASSWORD, ATIONET_NETWORK_ID y ATIONET_NETWORK_NAME
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000).

### Variables de entorno

| Variable                | Requerida | Descripción                                   |
| ----------------------- | :-------: | --------------------------------------------- |
| `ATIONET_USERNAME`      |    Sí     | Usuario OAuth de ATIONet.                     |
| `ATIONET_PASSWORD`      |    Sí     | Contraseña OAuth de ATIONet.                  |
| `ATIONET_NETWORK_ID`    |    Sí     | Id de la red (entidad).                       |
| `ATIONET_NETWORK_NAME`  |    Sí     | Nombre de la red (entidad).                   |
| `ATIONET_BASE_URL`      |    No     | Default `https://api.ationet.com`.            |
| `ATIONET_ENTITY_TYPE`   |    No     | Tipo de entidad (palabra completa), default `Network`. |

## Despliegue — Firebase App Hosting

La app usa SSR + API routes, por lo que se despliega con **Firebase App
Hosting** (corre sobre Cloud Run). Requiere el **plan Blaze**. La configuración
del runtime está en [`apphosting.yaml`](./apphosting.yaml).

### 1. Requisitos previos

```bash
npm install -g firebase-tools
firebase login
```

- Un proyecto de Firebase en plan **Blaze**.
- El repo alojado en GitHub (App Hosting despliega desde una rama).

### 2. Crear el backend

Desde la [consola de Firebase](https://console.firebase.google.com/) →
**App Hosting** → **Comenzar**:

1. Conectá el repositorio de GitHub y elegí la rama de despliegue (ej. `main`).
2. Firebase detecta Next.js y `apphosting.yaml` automáticamente.

O bien por CLI:

```bash
firebase init apphosting
```

### 3. Cargar los secretos

Las credenciales se guardan en **Cloud Secret Manager**, no en el repo:

```bash
firebase apphosting:secrets:set ationet-username
firebase apphosting:secrets:set ationet-password
firebase apphosting:secrets:set ationet-network-id
firebase apphosting:secrets:set ationet-network-name
```

Cada comando pide el valor y otorga acceso al backend. Los nombres coinciden
con las referencias `secret:` de `apphosting.yaml`.

### 4. Desplegar

Con App Hosting conectado a GitHub, **cada push a la rama configurada dispara
un despliegue automático**. Para forzar uno manual:

```bash
firebase deploy --only apphosting
```

## Scripts

| Comando         | Descripción                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Servidor de desarrollo.              |
| `npm run build` | Build de producción.                 |
| `npm run start` | Sirve el build de producción.        |
| `npm run lint`  | ESLint.                              |
