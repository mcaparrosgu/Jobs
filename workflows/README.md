# Workflows de n8n

Exportación **saneada** de los 4 workflows de producción (n8n 2.31). Para verlos: en n8n, *Workflows → Import from file*.

| Fichero | Qué hace | Nodos |
|---|---|---|
| [`jobs-ingesta.json`](jobs-ingesta.json) | Recoge ofertas de las fuentes, filtra, deduplica, puntúa y escribe en la hoja; aviso de fallos y métricas del embudo | 52 |
| [`jobs-generacion-cv.json`](jobs-generacion-cv.json) | Adapta CV y carta a cada oferta marcada (Claude + humanización con OpenAI) y crea los Google Docs | 26 |
| [`jobs-seguimiento.json`](jobs-seguimiento.json) | Lee respuestas de empresas por Gmail y propone un cambio de estado | 10 |
| [`jobs-archivado.json`](jobs-archivado.json) | Mueve candidaturas cerradas de `Ofertas_activas` a `Archivo` | 8 |

## Qué se quitó o se sustituyó

- **Credenciales:** cada nodo conserva el nombre de su credencial, pero el id es `<ID_CREDENCIAL>`; hay que reasignarlas tras importar.
- **IDs de Google** (hoja, carpeta de CVs, plantillas, etiqueta de Gmail): marcadores `<ID_HOJA_N8N_JOBS>`, `<ID_CARPETA_CVS>`, `<ID_PLANTILLA_CV>`, `<ID_PLANTILLA_CARTA>`, `<ID_FICHERO_PERFIL>`, `<ID_ETIQUETA_GMAIL>`.
- **Email:** `<TU_EMAIL>`.
- **Perfil de la candidata:** el resumen que usa el scoring es el marcador `<RESUMEN_DEL_PERFIL: …>`; ver [`data/examples/perfil_ejemplo.json`](../data/examples/perfil_ejemplo.json).
- Se eliminan `pinData`, `staticData`, `webhookId` y los metadatos de la instancia.
- **Claves:** ninguna va en el JSON; se leen de variables de entorno ([`.env.example`](../.env.example)).

## Para que funcionen

Hace falta una hoja `n8n_jobs` con las pestañas `Ofertas_activas`, `Archivo` y `Metricas` (ver [formato de la hoja](../docs/jobs-hoja-formato.md)), las credenciales de Google, Anthropic y Gmail en n8n, y las variables del `.env.example`.
