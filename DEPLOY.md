# Despliegue recomendado

## 1. Backend en Render

1. Sube este proyecto a GitHub.
2. En Render crea un nuevo `Web Service`.
3. Selecciona el repositorio.
4. Configura:
   - Root Directory: `pilecap-backend-complete`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/health`
5. Cuando Render publique el backend, copia la URL, por ejemplo:
   `https://pilecap-api.onrender.com`

## 2. Frontend en Vercel

1. En Vercel crea un nuevo proyecto desde el mismo repositorio.
2. Configura:
   - Root Directory: `pilecap-react-connected`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. En Environment Variables agrega:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://TU-BACKEND-RENDER.onrender.com/api`
4. Despliega.

## 3. Prueba final

Abre la URL de Vercel, presiona `Calcular diseño` y luego genera el PDF.

En local la app sigue usando `/api` por el proxy de Vite. En Vercel usa `VITE_API_BASE_URL`.
