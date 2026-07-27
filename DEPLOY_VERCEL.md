# PILECAP - Deploy a Vercel

## Requisitos previos

1. **Cuenta en Vercel**: https://vercel.com
2. **Cuenta en GitHub** (ya tienes): amariovp20-stack
3. **Cuenta en Render** (para el backend): https://render.com

## Pasos de despliegue

### 1. Frontend en Vercel

El frontend está configurado para desplegar automáticamente en Vercel.

**Configurar variables de entorno en Vercel:**

En el dashboard de Vercel, ir a **Settings → Environment Variables** y agregar:

```
VITE_API_BASE_URL=https://tu-backend.onrender.com/api
```

### 2. Backend en Render

El backend ya tiene `render.yaml` configurado.

1. Ve a https://render.com
2. Click en "New +" → "Web Service"
3. Conecta tu repositorio de GitHub
4. Selecciona la rama `main`
5. Render detectará automáticamente los ajustes en `render.yaml`
6. Click "Create Web Service"

Render te proporcionará una URL como: `https://pilecap-api.onrender.com`

### 3. Conectar Frontend y Backend

Una vez que tengas la URL del backend de Render, actualiza en Vercel:

Settings → Environment Variables
- `VITE_API_BASE_URL=https://tu-api-url.onrender.com/api`

Luego redeploy manualmente o push a main.

## Desarrollo local

```bash
cd pilecap-react-connected
npm install
npm run dev
```

El frontend estará en http://localhost:5173 y usa el proxy a http://localhost:8000/api

## Estructura del proyecto

```
PILECAP_APP/
├── pilecap-react-connected/    # Frontend (React + Vite)
├── pilecap-backend-complete/   # Backend (FastAPI)
├── render.yaml                 # Config para Render (backend)
└── vercel.json                 # Config para Vercel (frontend)
```
