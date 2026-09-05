---
name: n8n-mcp-native
description: "Usar SIEMPRE antes de llamar cualquier tool mcp__n8n-mcp__* en este proyecto (Jobs), en vez de fiarse de los nombres de tools del pack instalado n8n-mcp-skills. El servidor MCP conectado aquí (https://m.tail07d786.ts.net/mcp-server/http) es el servidor MCP NATIVO de la instancia n8n de Mar, no el paquete comunitario n8n-mcp (czlonkowski) que documentan las skills using-n8n-mcp-skills y n8n-mcp-tools-expert — esas dos describen una superficie de tools distinta (n8n_create_workflow, get_node, validate_node, n8n_manage_datatable...) que NO existe en este servidor. Invocar esta skill primero para conocer los nombres reales antes de adivinar."
---

# Superficie real del MCP n8n en Jobs (servidor nativo, no el paquete comunitario)

## Por qué existe esta skill

El pack `n8n-mcp-skills` (plugin, `czlonkowski/n8n-skills`) documenta el **paquete
comunitario `n8n-mcp`**, que habla con n8n vía su Public API y expone tools con prefijo
`n8n_*` (`n8n_create_workflow`, `n8n_update_partial_workflow`, `get_node`, `validate_node`,
`n8n_manage_datatable`, `n8n_manage_folders`, `n8n_manage_credentials`, `n8n_audit_instance`,
`n8n_manage_agents`, `n8n_list_catalog`, `n8n_health_check`, `search_templates`, `get_template`,
`n8n_deploy_template`, `n8n_evaluations`, `n8n_autofix_workflow`...).

**El servidor que este proyecto tiene conectado (`n8n-mcp` en `.claude.json`, URL
`https://m.tail07d786.ts.net/mcp-server/http`) es otro producto: el servidor MCP nativo/
oficial que la propia instancia n8n de Mar expone en su endpoint instance-level.** Su
superficie de tools es un "Workflow SDK" — construir workflows escribiendo código contra un
SDK propio, no enviando JSON completo ni diffs de operaciones. **Ninguna tool con prefijo
`n8n_*` existe aquí.** Confirmado el 5 sep 2026 auditando el plugin a fondo (ver memoria
`n8n-mcp-quirks.md` del usuario para el diagnóstico completo — versión del plugin, releases
de GitHub consultadas, `grep` sobre el pack instalado).

**Regla de oro:** antes de asumir el nombre de una tool `mcp__n8n-mcp__*`, comprobar la lista
real con `ToolSearch` (`select:mcp__n8n-mcp__<nombre_tentativo>` o una búsqueda por palabra
clave) o mirar los deferred tools listados al inicio de sesión. Si un nombre de las skills
genéricas del pack no aparece ahí, **no existe en este servidor** — no reintentar con
variantes, buscar el equivalente real en la lista de abajo.

## Lo que SÍ sigue siendo válido del pack `n8n-mcp-skills`

Las skills que hablan de n8n en general (no de qué tool MCP llamar) siguen aplicando tal
cual: `n8n-expression-syntax`, `n8n-code-javascript`, `n8n-code-python`, `n8n-code-tool`,
`n8n-node-configuration`, `n8n-workflow-patterns`, `n8n-validation-expert`,
`n8n-error-handling`, `n8n-binary-and-data`, `n8n-subworkflows`, `n8n-agents`,
`n8n-multi-instance`, `n8n-self-hosting`. Lo que **no** aplica es la lista de nombres de
tools de `using-n8n-mcp-skills` (sección "n8n-mcp tools") y toda la skill
`n8n-mcp-tools-expert` (incluidos SEARCH_GUIDE.md / VALIDATION_GUIDE.md / WORKFLOW_GUIDE.md /
OPERATIONS_GUIDE.md) — esos documentan el paquete comunitario.

## Superficie real conocida (snapshot 5 sep 2026 — verificar, puede cambiar)

Prefijo real de todas: `mcp__n8n-mcp__<nombre>`.

**Documentación y descubrimiento**
- `get_sdk_reference` — referencia obligatoria antes de escribir código del Workflow SDK
  (`workflow()`, `trigger()`/`node()`, `.add()`/`.to()`, `expr()`, patrones de credenciales).
  Secciones: `patterns`, `patterns_detailed`, `expressions`, `functions`, `rules`, `import`,
  `guidelines`, `design`, `all`. Llamar sin `section` para la referencia completa.
- `get_workflow_best_practices` — guía de diseño por técnica (`technique: "list"` para ver
  todas las disponibles: chatbot, scheduling, triage...).
- `search_nodes` — busca nodos por servicio/trigger/utilidad; devuelve IDs y discriminadores
  (resource/operation/mode) que hacen falta para `get_node_types`.
- `get_node_types` — definiciones TypeScript exactas de parámetros. Obligatorio antes de
  escribir código de workflow — no adivinar nombres de parámetros. `nodeIds` es un array de
  `{nodeId, resource?, operation?, mode?, version?}`.
- `explore_node_resources` — resuelve valores reales de un dropdown/resource-locator
  (`loadOptions`/`listSearch`) con una credencial real, para no inventar IDs.

**Validar**
- `validate_node_config` — valida uno o varios configs de nodo de forma aislada (solo
  esquema; sin grafo), antes de montar `create_workflow_from_code` o llamar `update_workflow`.
  Soporta `isToolNode: true` para subnodos de agente IA.
- `validate_workflow` — valida el workflow completo (conexiones, credenciales, triggers).

**Construir / editar**
- `create_workflow_from_code` — crea un workflow escribiendo código contra el SDK (ver
  `get_sdk_reference`).
- `update_workflow` — actualiza un workflow existente. Deja un draft (`versionId` !=
  `activeVersionId`); hace falta `publish_workflow` para que llegue a producción.
- `publish_workflow` / `unpublish_workflow` — publican/despublican un draft. **`publish_workflow`
  lo bloquea el clasificador de auto-mode de Claude Code en esta sesión** — dejar el draft
  verificado byte a byte y pedir a Mar que pulse Publish en el editor.
- `archive_workflow` — archiva un workflow.

**Inspeccionar y versionar**
- `get_workflow_details` — detalle de un workflow (nota: `credentials` sale siempre `null` al
  leer, aunque el nodo tenga credencial en producción — no se puede verificar por lectura).
- `get_workflow_history`, `get_workflow_version`, `restore_workflow_version` — historial de
  versiones nativo de n8n (incluye ediciones hechas a mano en la UI).
- `search_workflows` — listar/filtrar workflows.
- `search_folders`, `search_projects`, `list_tags` — organización de la instancia.
- `list_credentials` — lista credenciales (sin exponer secretos).

**Ejecutar y probar**
- `test_workflow` — ejecuta el workflow (nodos reales, efectos reales). Pedir confirmación al
  usuario si hay side effects.
- `prepare_test_pin_data` — prepara datos fijados para probar sin disparar un trigger real.
- `execute_workflow` — ejecución manual real; el clasificador de permisos de Claude Code puede
  bloquearla, necesita autorización explícita.
- `search_executions`, `get_execution` — listar/inspeccionar ejecuciones pasadas.

**Data tables**
- `search_data_tables`, `create_data_table`, `rename_data_table` — gestión de tablas.
- `add_data_table_column`, `rename_data_table_column`, `delete_data_table_column` — columnas.
- `add_data_table_rows` — insertar filas.

## Rarezas de esta instancia (resumen — detalle completo en memoria del usuario)

- `get_workflow_details`/`get_workflow_version` ocultan `credentials` siempre (sale `null`).
- Modelo draft/publish: `update_workflow` no llega a producción hasta `publish_workflow`.
- `publish_workflow` bloqueado por el clasificador de auto-mode → pedir Publish a Mar.
- `execute_workflow` pide autorización explícita del usuario.
- Falsos positivos de validación conocidos: Gmail v2.2 "Missing discriminator
  parameters.operation", Merge v3.2 "numberInputs must be 2".
- El nodo Google Sheets `append` no resuelve pestañas nuevas por `gid` en modo `list` —
  referenciar por `mode: "name"`.
- `new URL()` no funciona en el sandbox del Code node de esta instancia (n8n 2.31.5,
  JsTaskRunnerSandbox) — parsear URLs a mano con regex.
- Google Drive `copy` sin `folderId` deja la copia en la carpeta del archivo origen.

Ver `n8n-mcp-quirks` en la memoria persistente del usuario para el detalle completo y la
evidencia de cada punto.
