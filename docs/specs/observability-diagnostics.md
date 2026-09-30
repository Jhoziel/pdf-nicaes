# Observabilidad y diagnóstico privado

## Objetivo

Permitir que un incidente de PDF Nicaes deje evidencia correlacionable y descargable aunque la interfaz haya alcanzado 100%, sin sacar del navegador PDFs ni datos de negocio. La versión desplegada debe ser identificable y el diagnóstico remoto debe existir únicamente para incidentes.

## Alcance

- Aplicación web desplegada con Cloudflare Workers Builds y Static Assets.
- ID visible por ejecución.
- Informe diagnóstico local para ejecuciones recientes.
- Envío sanitizado a Cloudflare solo desde producción y solo ante incidentes.
- Versión de despliegue visible e incluida en cada diagnóstico.
- Reglas de integridad antes de exponer resultados o descargas.
- Pruebas de privacidad, observabilidad, CSP y carga.

El ejecutable de Windows queda obsoleto y fuera de este trabajo. No se elimina ni se actualiza como parte de esta iniciativa.

## Ciclo de una ejecución

1. Pulsar la acción de procesamiento crea un UUID aleatorio y un diagnóstico en memoria.
2. La ejecución recorre fases agregadas de preparación, lectura, OCR, indexación, construcción o planificación y validación.
3. El 100% significa que el resultado de procesamiento quedó validado; no afirma que todos los ZIP opcionales ya fueron materializados.
4. Cada intento de descarga incrementa contadores monotónicos bajo el mismo UUID. Para respetar el límite de 16 KiB, el informe conserva el detalle —número, fase y desenlace— de los 24 intentos más recientes y mantiene totales de intentos, éxitos e incidentes aunque rote el detalle anterior.
5. Iniciar otra ejecución conserva en memoria como máximo los tres diagnósticos más recientes.
6. Recargar o cerrar la pestaña elimina esos diagnósticos. No se usa `localStorage`, `sessionStorage`, IndexedDB ni otra cola persistente.

## Desenlaces

- `completed`: procesamiento validado sin condiciones de revisión.
- `completed_with_review`: procesamiento validado con un resultado normal que requiere atención, como faltantes, conflictos o páginas sin identificar.
- `cancelled`: el colaborador canceló en un límite seguro; no es un incidente.
- `incident`: ocurrió una excepción técnica, falló una regla de integridad, no pudo materializarse un artefacto o el colaborador declaró incorrecto el resultado.

Un resultado PCL parcial, sin coincidencias o inválido según sus reglas de negocio no se convierte automáticamente en incidente.

## Fases diagnósticas

Los nombres técnicos son estables y no se traducen dentro del informe:

- `preparing`
- `reading_pdf`
- `reading_pcl`
- `ocr`
- `indexing`
- `building_result`
- `planning_packages`
- `reviewing`
- `validating`
- `building_pdf`
- `building_individual_zip`
- `building_master_zip`
- `ready`

El diagnóstico registra transiciones, timestamps UTC, duración y contadores agregados. No crea eventos por página.

## Contrato diagnóstico

El archivo será JSON UTF-8 legible, con `schemaVersion: 1`, y permanecerá debajo de 16 KiB. El evento remoto será un subconjunto del mismo objeto visible localmente.

Campos permitidos:

- Versión de esquema.
- UUID y número de intento de descarga, cuando corresponda.
- SHA completo, SHA corto y canal de despliegue.
- Modo de procesamiento.
- Desenlace, fase y código estable de error.
- Timestamps, duración total y duración por fase.
- Cantidades agregadas de PDFs, PCL, páginas inspeccionadas, páginas OCR, asignaciones manuales, hojas conservadas sin identificar, resultados, artefactos e intentos de descarga completados o fallidos.
- Perfil agregado de detección.
- Familia y versión mayor del navegador.
- Capacidades booleanas del runtime (`Worker`, WebAssembly, contexto seguro, aislamiento y estado en línea) y revisión del contrato diagnóstico.
- Estado estructurado de inicialización OCR: etapa estable, porcentaje, tiempo límite, duración y resultado HTTP agregado de cada recurso local conocido.
- Estado del envío remoto: no requerido, enviado o no enviado.

Los campos `runtime` y `ocrInit` son extensiones opcionales compatibles con `schemaVersion: 1`: el receptor sigue
aceptando reportes anteriores que no los incluyan. Sus nombres, estados y recursos proceden de listas cerradas.

Datos prohibidos:

- Bytes, blobs o contenido de PDFs/PCL.
- Nombres de archivos o paquetes.
- Códigos TRUSS, etiquetas detectadas o números de página individuales.
- Filas PCL, texto extraído, muestras OCR o comentarios libres.
- Hashes o identificadores derivados del contenido.
- Estado completo de JavaScript.
- Mensajes de excepción crudos, user-agent completo o datos de ubicación.

Los errores usan códigos técnicos estables; la interfaz traduce sus explicaciones al español o inglés.

Para inicialización OCR se distinguen `OCR_UNAVAILABLE` cuando la API principal no está presente,
`OCR_INIT_TIMEOUT` cuando vence el límite de 60 segundos y `OCR_INIT_FAILED` cuando el worker,
el núcleo o el modelo rechazan la inicialización antes de ese límite.

Antes de crear el worker se realizan solicitudes `HEAD` del mismo origen, con caché desactivada y límite de cinco
segundos, para el worker, el modelo inglés y las cuatro variantes del núcleo. Estas sondas no bloquean por sí solas
el OCR: registran únicamente `ok`, `http_error`, `network_error`, `timeout` o `unsupported`, el estado HTTP y la
duración. El progreso de Tesseract se reduce a las etapas `worker`, `core`, `language`, `api` y `ready`; nunca se
conserva el texto libre emitido por la biblioteca.

## Perfil de detección

El perfil solo contiene conteos agregados por estrategia:

- Encabezado tabular TRUSS.
- Texto adyacente a TRUSS.
- Fallback MiTek.
- Texto codificado reconocido.
- OCR.
- Diseño ambiguo.
- Sin identificar.
- Coexistencia de encabezados TRUSS y TRUSS TYPE.

Ningún conteo se asocia con una página o código concreto. Una ambigüedad no genera telemetría por sí sola, pero acompaña el informe cuando existe un incidente.

## Reglas de integridad

Reglas comunes:

- Cada PDF cargado queda procesado, omitido como duplicado idéntico o asociado a un fallo explícito.
- Todas las páginas inspeccionadas aparecen exactamente una vez en los conteos agregados correspondientes.
- Ningún resultado referencia una fuente o página inexistente.

Separación:

- La suma de páginas de salida coincide con el total de páginas únicas inspeccionadas.
- Cada página pertenece a un único grupo, incluido el grupo sin identificar.

Combinación:

- Páginas conservadas más páginas descartadas coincide con el total inspeccionado.
- El PDF combinado contiene exactamente las páginas conservadas en el orden decidido.

Paquetes PCL:

- Para cada PCL válido, las TRUSS solicitadas únicas se reparten exactamente entre disponibles, faltantes y conflictos.
- Cada TRUSS disponible tiene exactamente una fuente seleccionada y un artefacto esperado.
- Entradas duplicadas o filas inválidas no alteran el conjunto de solicitudes únicas.

Descargas:

- Las entradas tienen rutas relativas seguras y nombres únicos.
- Cada artefacto contiene la cantidad y tipo de entradas esperados.
- El ZIP maestro contiene todos los paquetes previstos y su reporte general, o no se entrega.

Un incumplimiento en fases compartidas bloquea todo el resultado. Un fallo posterior de descarga bloquea solo ese artefacto; los resultados ya validados permanecen disponibles.

## Envío remoto

- Solo producción transmite diagnósticos.
- Excepciones, fallos de integridad y fallos de artefactos se envían automáticamente.
- Un resultado declarado incorrecto se envía únicamente después de que el colaborador revise la vista previa y confirme.
- Éxitos, cancelaciones y resultados normales con revisión no se envían.
- Se permiten como máximo dos intentos durante la pestaña actual; no se conserva una cola para sesiones futuras.
- Si ambos intentos fallan, la interfaz lo informa y destaca la descarga local.

El receptor será un Worker del mismo origen, compartiendo el mismo contrato sanitizado con la implementación compatible de Pages. Aceptará únicamente `POST` con JSON versionado, rechazará campos adicionales y cuerpos mayores de 16 KiB, no expondrá consultas públicas y tendrá rate limiting en Cloudflare. No se usará CAPTCHA.

Workers Logs será el almacenamiento inicial. Su retención depende del plan de Cloudflare; el informe local es la evidencia alternativa cuando el evento remoto ya expiró o nunca pudo enviarse.

## Interfaz

- Mostrar `Ejecución · <8 caracteres>` durante progreso, incidentes y resultados.
- Permitir copiar el UUID completo.
- Mostrar `Versión <SHA corto>` discretamente en el pie.
- Incluir SHA completo y canal en el informe.
- Ofrecer el informe discretamente en ejecuciones completadas y de forma prominente ante incidentes.
- Mantener una sección de hasta tres diagnósticos recientes en memoria.
- Ofrecer `Reportar resultado incorrecto` con vista previa no editable, acciones de enviar y descargar, y sin campo de texto o adjuntos.
- Explicar en la nota de privacidad que los documentos permanecen locales y que solo se envían metadatos sanitizados ante incidentes.

## Versión de despliegue

Workers Builds materializará `WORKERS_CI_COMMIT_SHA` y `WORKERS_CI_BRANCH`; el build conserva además compatibilidad con `CF_PAGES_COMMIT_SHA` y `CF_PAGES_BRANCH`. La interfaz muestra los primeros siete caracteres; el diagnóstico conserva el SHA completo y el canal. Si no existe metadata válida de build, se usa `local-dev` y se desactiva el envío remoto.

## Verificación

Las pruebas deben demostrar:

- Cero solicitudes diagnósticas para éxito, cancelación y resultados PCL normales con revisión.
- Un único evento válido por incidente, salvo el segundo intento de transporte permitido.
- Sanitización aun cuando nombres, filas o excepciones contengan valores diseñados para filtrarse.
- Rechazo de origen, método, esquema, campos o tamaño no permitidos.
- Detección de fallos de PDF/ZIP posteriores al 100% del procesamiento.
- Flujo manual de resultado incorrecto.
- ID y versión visibles y presentes en el informe.
- CSP real aplicada en una prueba equivalente a producción.

## Pruebas de carga

La línea base inicial usa Windows 11, Chrome y Edge actuales, 8 GB de RAM y cuatro núcleos. Las cargas separan cantidad de archivos, páginas, bytes y proporción OCR; incluyen 100, 500 y 2,000 páginas y, por separado, 100, 500 y 2,000 PDFs pequeños.

Cada escenario se ejecuta tres veces y exige cero corrupción o crashes, cancelación en el siguiente límite seguro, ZIP correcto y liberación de recursos conocidos. La primera ejecución establece la línea base; los límites temporales y de regresión se fijan después con evidencia, no por una promesa previa. Los corpus reales permanecen locales y sin versionar; el repositorio conserva únicamente generadores, harness y resultados agregados.

## Orden de entrega

1. Observabilidad, identificación de versión, actualización de privacidad, endpoint y pruebas.
2. IBM Plex Sans alojada localmente y verificación de CSP.
3. Harness y línea base de carga.
4. Continuación del flujo UX/Figma.

La primera entrega no incluye trabajo sobre el ejecutable de Windows.
