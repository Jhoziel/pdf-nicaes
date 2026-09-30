# Procesamiento local de planos TRUSS

Este contexto describe cómo PDF Nicaes interpreta planos TRUSS y produce resultados auditables mediante separación, combinación o preparación de paquetes PCL.

## Language

**Código TRUSS**:
Identificador de un plano TRUSS, como `F01`, `F05A` o `KWB10S`, comparado por igualdad exacta después de normalizar mayúsculas y minúsculas.
_Avoid_: Nombre de archivo, código aproximado

**PDF fuente**:
PDF aportado al lote como posible origen de una o más TRUSS solicitadas.
_Avoid_: Paquete PCL, PCL de edificio

**PCL de edificio**:
Archivo de control cuyo nombre identifica un edificio y cuyo listado define los códigos TRUSS solicitados para ese edificio. Los campos distintos del nombre `.tre` no forman parte de la solicitud.
_Avoid_: PDF de control, lista de cantidades

**Entrada duplicada del PCL**:
Segunda aparición de un código TRUSS dentro del mismo PCL de edificio. Se informa, pero representa una sola TRUSS solicitada.
_Avoid_: Conflicto TRUSS

**TRUSS solicitada**:
Código TRUSS incluido en un PCL de edificio.
_Avoid_: TRUSS esperada

**TRUSS disponible**:
TRUSS solicitada que tiene una única coincidencia exacta entre los PDFs fuente.
_Avoid_: TRUSS encontrada

**TRUSS faltante**:
TRUSS solicitada sin coincidencias exactas entre los PDFs fuente.
_Avoid_: Archivo faltante

**Conflicto TRUSS**:
TRUSS solicitada encontrada en más de un PDF fuente. Varias páginas con el mismo código dentro de un único PDF fuente no constituyen conflicto; un conflicto no se incluye en el resultado.
_Avoid_: Duplicado aceptado, versión más reciente

**Paquete PCL**:
Resultado correspondiente a un PCL de edificio, nombrado a partir del PCL y compuesto por un PDF por cada TRUSS disponible y su reporte.
_Avoid_: PDF combinado

**Reporte PCL**:
Registro del resultado de un paquete PCL que permite distinguir TRUSS disponibles, faltantes, en conflicto y entradas duplicadas. Clasifica el paquete como satisfactorio, parcial o sin coincidencias.
_Avoid_: Diagnóstico general

**Lote PCL**:
Conjunto de paquetes PCL producidos en una misma operación y reunidos para descarga conjunta.
_Avoid_: Paquete PCL

**Ejecución**:
Solicitud completa de procesamiento iniciada por el colaborador, desde la lectura de las entradas hasta la generación de sus resultados descargables, identificada como una sola unidad aunque haya varios intentos de descarga.
_Avoid_: Operación, sesión

**Resultado de procesamiento**:
Desenlace del análisis de una ejecución, independiente de que el colaborador decida materializar después uno o varios archivos descargables.
_Avoid_: ZIP generado, descarga completada

**Revisión de resultado**:
Decisión explícita del colaborador sobre un resultado de procesamiento que requiere atención, antes de materializar artefactos descargables. Permite confirmar reemplazos de combinación y, para páginas sin Código TRUSS identificable, asignar un Código TRUSS exacto o conservarlas sin identificar.
_Avoid_: Edición de PDF, validación de integridad

**Asignación manual de TRUSS**:
Decisión tomada durante la revisión de resultado que asocia una página sin Código TRUSS identificable con un Código TRUSS exacto para la ejecución actual. Sustituye el resultado de detección de esa página sin modificar el PDF fuente.
_Avoid_: Corrección OCR, renombrado de archivo, coincidencia aproximada

**Intento de descarga**:
Solicitud de materializar un archivo descargable perteneciente a una ejecución; varios intentos pueden compartir la misma ejecución sin convertirse en ejecuciones nuevas.
_Avoid_: Ejecución nueva, procesamiento

**Artefacto descargable**:
PDF o ZIP materializado a partir de un resultado de procesamiento validado.
_Avoid_: Resultado de procesamiento, paquete pendiente

**Perfil de detección**:
Distribución agregada de las estrategias con las que una ejecución interpretó sus páginas, sin asociar estrategias con páginas o códigos TRUSS concretos.
_Avoid_: Registro de páginas, muestra de texto

**Informe diagnóstico de ejecución**:
Registro técnico sanitizado de una ejecución que permite investigar su recorrido y desenlace sin contener nombres de archivo, códigos TRUSS ni contenido de las entradas.
_Avoid_: Reporte PCL, diagnóstico general

**Incidente de ejecución**:
Ejecución con un fallo técnico, una regla de integridad incumplida, un resultado que no pudo generarse o un resultado que el colaborador declaró incorrecto. Una cancelación o un resultado PCL parcial no constituyen por sí solos un incidente.
_Avoid_: PCL parcial, cancelación
