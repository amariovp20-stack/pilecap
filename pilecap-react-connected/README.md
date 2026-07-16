# PileCap React Connected

Frontend React conectado al backend FastAPI del calculo de cabezal de pilotes.

## 1. Instalar
```bat
npm install
```

## 2. Ejecutar frontend
Comando habitual:

```bat
npm run dev
```

Si PowerShell bloquea `npm`, usa:

```bat
start-frontend.cmd
```

O directamente:

```bat
npm.cmd run dev -- --host 127.0.0.1
```

## 3. Ejecutar backend
El backend debe estar disponible en:

```text
http://127.0.0.1:8000
```

Desde la raiz del proyecto puedes usar:

```bat
start-backend.cmd
```

Para levantar frontend y backend juntos:

```bat
start-dev.cmd
```

## 4. URL usada por defecto en frontend
```text
http://127.0.0.1:8000/api
```

Puedes cambiarla desde la caja de texto superior si tu API usa otra ruta.

## Endpoint esperado
```text
POST /api/pilecap/design
```
