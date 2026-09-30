# Runbook de incidentes diagnósticos

El receptor remoto de este procedimiento corresponde a la alternativa Cloudflare. El ZIP para servidores de Nicaes funciona sin receptor: solicitar el informe diagnóstico descargable y continuar con esa evidencia local. No buscar esos incidentes en Workers Logs ni cambiar el canal del paquete a `production`.

Este procedimiento aplica después de desplegar la observabilidad descrita en `docs/specs/observability-diagnostics.md`.

Antes de habilitarla en producción, limitar en Cloudflare las solicitudes `POST` a `/api/diagnostics` y vigilar respuestas 429. El umbral debe fijarse con tráfico legítimo observado; no se debe usar una consulta pública de diagnósticos como mecanismo de soporte.

1. Solicitar únicamente el ID de ejecución o el informe diagnóstico descargado. No solicitar PDFs, archivos PCL, Reportes PCL, nombres de archivo ni códigos TRUSS.
2. Buscar el UUID completo en Workers Logs del proyecto de producción y confirmar el SHA de despliegue.
3. Revisar desenlace, última fase completada, código técnico, duraciones, contadores agregados y perfil de detección.
4. Distinguir un fallo de procesamiento compartido de un fallo aislado al generar una descarga.
5. Si no existe un evento remoto, comprobar si expiró según la retención del plan o si el informe indica que no pudo enviarse; continuar únicamente con el informe local sanitizado.
6. No publicar una consulta de logs ni copiar metadatos de solicitudes fuera del acceso autorizado de Cloudflare.

El ID correlaciona evidencia técnica; no permite reconstruir nombres, TRUSS ni contenido de los documentos.
