# PileCap Backend Complete

Backend FastAPI listo para trabajar con el frontend React del proyecto de cabezales de pilotes.

## Instalación
```bash
pip install -r requirements.txt
```

## Ejecutar
```bash
uvicorn app.main:app --reload
```

## Swagger
```text
http://127.0.0.1:8000/docs
```

## Endpoint principal
```text
POST /api/pilecap/design
```

## Salud del sistema
```text
GET /api/health
```

## Nota
Este backend está preparado para conectarse con el frontend React entregado antes.
Incluye CORS habilitado para desarrollo local.
