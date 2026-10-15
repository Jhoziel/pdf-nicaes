/* global PDFLib, pdfjsLib */

const PDFJS_VERSION = "3.11.174";
const TESSERACT_VERSION = "5.1.0";
const PDFJS_WORKER_PATH = `assets/vendor/pdfjs/${PDFJS_VERSION}/pdf.worker.min.js`;
const TESSERACT_WORKER_PATH = `assets/vendor/tesseract.js/${TESSERACT_VERSION}/worker.min.js`;
const TESSERACT_CORE_PATH = `assets/vendor/tesseract.js-core/${TESSERACT_VERSION}`;
const TESSERACT_LANGUAGE_PATH = "assets/vendor/tessdata/4.0.0";
const TESSERACT_RESOURCE_PATHS = Object.freeze({
  worker: TESSERACT_WORKER_PATH,
  language: `${TESSERACT_LANGUAGE_PATH}/eng.traineddata.gz`,
  coreStandard: `${TESSERACT_CORE_PATH}/tesseract-core.wasm.js`,
  coreLstm: `${TESSERACT_CORE_PATH}/tesseract-core-lstm.wasm.js`,
  coreSimd: `${TESSERACT_CORE_PATH}/tesseract-core-simd.wasm.js`,
  coreSimdLstm: `${TESSERACT_CORE_PATH}/tesseract-core-simd-lstm.wasm.js`,
});
const OCR_LOAD_TIMEOUT_MS = 60_000;
const OCR_RESOURCE_TIMEOUT_MS = 5_000;
const LANGUAGE_STORAGE_KEY = "pdf-nicaes-language";
const THEME_STORAGE_KEY = "pdf-nicaes-theme";
const UNIDENTIFIED_LABEL = "SIN-IDENTIFICAR";

const translations = {
  es: {
    metaDescription: "Organiza planos PDF y archivos TRE usando códigos TRUSS y PCL.",
    documentTitle: "PDF Nicaes - planos PDF y archivos TRE",
    brandHome: "PDF Nicaes, inicio",
    languageSelectorLabel: "Idioma",
    languageSpanishLabel: "Usar español",
    languageEnglishLabel: "Usar inglés",
    themeLabel: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    themeSwitchToLight: "Cambiar a modo claro",
    themeSwitchToDark: "Cambiar a modo oscuro",
    privacySummary: "Procesamiento local",
    privacyBody: "Tus documentos permanecen en este navegador. Solo ante un incidente se envían metadatos técnicos sanitizados; nunca PDFs, archivos TRE, PCL, nombres, códigos TRUSS ni contenido.",
    heroEyebrow: "Herramienta técnica de planos",
    heroTitle: "Separa y actualiza planos PDF.",
    heroBody: "Detecta el código bajo “TRUSS”, organiza versiones y descarga resultados listos para trabajar.",
    workflowLabel: "Progreso del trabajo",
    stepFiles: "Archivos",
    stepOperation: "Operación",
    stepResults: "Resultados",
    workspaceLabel: "Procesamiento de archivos PDF, TRE y PCL",
    uploadTitle: "Añade tus planos PDF",
    uploadBody: "Arrástralos aquí o selecciónalos desde tu equipo.",
    selectPdfs: "Seleccionar PDFs o ZIP",
    loadExample: "Cargar ejemplo de prueba",
    loadingExample: "Preparando ejemplo…",
    exampleReady: ({ action }) => `Ejemplo listo. Pulsa “${action}” para completar la prueba.`,
    exampleError: "No se pudo crear el ejemplo. Recarga la página y revisa tu conexión.",
    loadedFiles: "Archivos cargados",
    addPdfs: "Añadir PDFs",
    removeAll: "Quitar todos",
    queueHelp: "El orden define la prioridad al combinar: la versión más reciente debe quedar al final.",
    operationKicker: "Paso 2 · Operación",
    operationTitle: "¿Qué resultado necesitas?",
    operationLegend: "Selecciona una operación",
    splitTitle: "Separar por código",
    splitBody: "Genera un PDF por cada valor bajo TRUSS.",
    splitOutcome: "Resultado: un PDF por TRUSS",
    mergeTitle: "Combinar y actualizar",
    mergeBody: "Conserva la versión más reciente de cada código.",
    mergeOutcome: "Resultado: última versión por TRUSS",
    pclModeTitle: "Generar paquetes por PCL",
    pclModeBody: "Crea un ZIP por edificio con un PDF por TRUSS y su reporte.",
    pclOutcome: "Resultado: un ZIP por edificio",
    trePclModeTitle: "Separar archivos TRE por PCL",
    trePclModeBody: "Organiza los archivos .TRE solicitados en una carpeta por PCL.",
    trePclOutcome: "Resultado: un ZIP con una carpeta por PCL",
    trePclPclUploadTitle: "Añade los PCL que indican los archivos TRE",
    trePclPclUploadBody: "Cada PCL crea una carpeta con los archivos TRE que solicita.",
    trePclQueueHelp: "Cada PCL se convierte en una carpeta independiente dentro del ZIP.",
    treUploadTitle: "Añade los archivos .TRE",
    treUploadBody: "Se incluirá cada archivo cuyo nombre aparezca en un PCL.",
    selectTres: "Seleccionar TRE",
    loadedTres: "TRE cargados",
    addTres: "Añadir TRE",
    removeAllTres: "Quitar todos",
    showMoreTres: "Mostrar 100 TRE más",
    pclUploadTitle: "Añade los archivos PCL de los edificios",
    pclUploadBody: "Cada PCL generará su propio paquete ZIP y reporte. También puedes cargar aquí un ZIP completo.",
    selectPcls: "Seleccionar PCL",
    loadedPcls: "PCL cargados",
    addPcls: "Añadir PCL",
    removeAllPcls: "Quitar todos",
    pclQueueHelp: "El orden del PCL se conserva en cada paquete.",
    showMoreFiles: "Mostrar 100 PDFs más",
    showMorePcls: "Mostrar 100 PCL más",
    addPdfsToContinue: "Añade PDFs para continuar",
    addPdfsAndPclsToContinue: "Añade PDFs y PCL para continuar",
    processHint: "Selecciona al menos un PDF para habilitar esta acción.",
    pclProcessHint: "Selecciona al menos un PDF y un PCL para habilitar esta acción.",
    trePclProcessHint: "Selecciona al menos un archivo TRE y un PCL para habilitar esta acción.",
    localStrong: "Tus documentos permanecen en tu equipo.",
    localBody: "Los resultados se generan localmente. Si ocurre un incidente, solo se envían metadatos técnicos sanitizados.",
    progressKicker: "Estado del proceso",
    progressPreparing: "Preparando archivos",
    cancel: "Cancelar",
    cancelling: "Cancelando…",
    readyToDownload: "Listo para descargar",
    reviewKicker: "Revisión requerida",
    reviewTitle: "Confirma el resultado antes de descargar",
    reviewHelp: "Revisa cada hoja sin identificar y las sustituciones por prioridad. Las descargas se habilitan solo después de confirmar.",
    reviewCount: ({ count }) => `${count} ${count === 1 ? "decisión" : "decisiones"}`,
    reviewSourceMeta: ({ source, page }) => `${source} · página ${page}`,
    assignCode: "Asignar código TRUSS",
    keepUnidentified: "Conservar como SIN-IDENTIFICAR",
    codeLabel: "Código TRUSS exacto",
    codePlaceholder: "Ejemplo: F01",
    keepAllUnidentified: "Conservar todas sin identificar",
    keepAllConfirm: "Esto conservará todas las hojas pendientes como SIN-IDENTIFICAR. ¿Deseas continuar?",
    confirmReview: "Confirmar revisión",
    restartReview: "Volver a los archivos",
    reviewIncomplete: "Debes asignar o conservar explícitamente cada hoja sin identificar.",
    reviewCodeInvalid: "Introduce un código TRUSS exacto usando letras, números, guion o guion bajo.",
    progressReviewRequired: "Revisión requerida",
    reviewRequiredDetail: "Confirma las decisiones antes de generar y habilitar las descargas.",
    progressApplyingReview: "Aplicando la revisión",
    applyingReviewDetail: "Recalculando resultados y verificando su integridad.",
    reviewReplacementsTitle: "Sustituciones por prioridad",
    reviewReplacement: ({ code, winner, discarded }) => `${code}: se conservará ${winner}; se reemplaza ${discarded}.`,
    reviewPreviewAlt: ({ source, page }) => `Vista previa de ${source}, página ${page}`,
    errorReviewPreview: "No se pudo generar una vista previa completa. No se habilitaron descargas; vuelve a intentarlo.",
    reviewConfirmed: "Revisión confirmada y resultados verificados.",
    resultsTitle: "Resultados",
    downloadZip: "Descargar todo como ZIP",
    resultsSummaryLabel: "Resumen del procesamiento",
    searchByCode: "Buscar por código",
    searchPlaceholder: "Ejemplo: F01",
    filterResultsLabel: "Filtrar resultados",
    filterAll: "Todos",
    filterReview: "Sin identificar",
    filterPclReview: "Requieren revisión",
    loadMore: "Mostrar 30 más",
    addMoreFiles: "Añadir más archivos",
    startOver: "Empezar de nuevo",
    footerNote: "PDF Nicaes · Procesamiento privado en tu navegador",
    diagnosticsKicker: "Diagnóstico privado",
    diagnosticsTitle: "Información para resolver problemas",
    diagnosticHelp: "Este reporte excluye PDFs, nombres de archivos, códigos TRUSS y contenido.",
    copyExecutionId: "Copiar ID",
    downloadDiagnostic: "Descargar diagnóstico",
    reportIncorrect: "Reportar resultado incorrecto",
    recentDiagnostics: "Diagnósticos recientes",
    reportPreviewKicker: "Antes de enviar",
    reportPreviewTitle: "Revisa el reporte sanitizado",
    close: "Cerrar",
    reportPreviewHelp: "Estos son exactamente los campos técnicos que se enviarán; la hora se actualiza al confirmar. No contiene tus documentos ni sus datos.",
    downloadOnly: "Descargar sin enviar",
    sendReport: "Enviar diagnóstico",
    executionLabel: ({ id }) => `Ejecución · ${id}`,
    versionLabel: ({ version }) => `Versión ${version}`,
    diagnosticStatusPending: "Enviando diagnóstico…",
    diagnosticStatusSent: "Diagnóstico enviado",
    diagnosticStatusNotSent: "No se pudo enviar",
    diagnosticStatusNotRequired: "Guardado solo en este navegador",
    executionIdCopied: "ID de ejecución copiado.",
    diagnosticDownloaded: "Diagnóstico descargado.",
    incorrectReported: "Diagnóstico enviado.",
    incorrectDownloaded: "Diagnóstico guardado sin enviarlo.",
    diagnosticOutcomeProcessing: "En proceso",
    diagnosticOutcomeCompleted: "Completada",
    diagnosticOutcomeCompletedWithReview: "Completada con revisión",
    diagnosticOutcomeIncident: "Incidente",
    diagnosticOutcomeCancelled: "Cancelada",
    processPdfs: "Procesar PDFs",
    progressFailed: "No se pudo procesar",
    progressCancelled: "Proceso cancelado",
    progressCancelledDetail: "No se generaron archivos parciales. Puedes ajustar la lista e intentarlo de nuevo.",
    errorAria: ({ detail }) => `Error: ${detail}`,
    progressAria: ({ label, percent }) => `${label}: ${percent}%`,
    processMergeAction: ({ count }) => `Combinar ${count} ${count === 1 ? "PDF" : "PDFs"}`,
    processSplitAction: ({ count }) => `Separar ${count} ${count === 1 ? "PDF" : "PDFs"}`,
    processPclAction: ({ count }) => `Generar ${count} ${count === 1 ? "paquete" : "paquetes"}`,
    processTrePclAction: ({ count }) => `Separar TRE para ${count} ${count === 1 ? "PCL" : "PCL"}`,
    toastRemovedFile: ({ name }) => `${name} se quitó de la lista.`,
    toastOrderUpdated: "Orden de archivos actualizado.",
    versionSingle: "Archivo único",
    versionLatest: "Más reciente · prevalece",
    versionFirst: "Primera versión",
    versionMiddle: "Versión intermedia",
    priorityNote: ({ name }) => `<strong>${name}</strong> está al final y tendrá prioridad cuando un código se repita.`,
    fileCount: ({ count }) => `${count} ${count === 1 ? "PDF" : "PDFs"}`,
    pclFileCount: ({ count }) => `${count} ${count === 1 ? "PCL" : "PCL"}`,
    pclFileMeta: ({ size, position, total }) => `${size} · PCL ${position} de ${total}`,
    treFileCount: ({ count }) => `${count} TRE`,
    treFileMeta: ({ size, position, total }) => `${size} · TRE ${position} de ${total}`,
    filePosition: ({ size, position, total }) => `${size} · posición ${position} de ${total}`,
    fileActions: ({ name }) => `Acciones para ${name}`,
    moveUpLabel: ({ name }) => `Mover ${name} hacia arriba`,
    moveDownLabel: ({ name }) => `Mover ${name} hacia abajo`,
    removeLabel: ({ name }) => `Quitar ${name}`,
    moveUp: "Subir",
    moveDown: "Bajar",
    remove: "Quitar",
    replaceFile: "Reemplazar archivo",
    selectAtLeastOnePdf: "Selecciona al menos un archivo PDF.",
    toastReplacedFile: ({ previous, replacement }) => `${previous} se reemplazó por ${replacement}.`,
    addedPdfs: ({ count }) => `${count} ${count === 1 ? "PDF añadido" : "PDFs añadidos"}`,
    ignoredDuplicates: ({ count }) => `${count} ${count === 1 ? "duplicado ignorado" : "duplicados ignorados"}`,
    rejectedFiles: ({ count }) => `${count} ${count === 1 ? "archivo rechazado" : "archivos rechazados"} por no ser PDF`,
    filesAddedSummary: ({ added, duplicates, rejected }) => {
      const parts = [];
      if (added) parts.push(`${added} ${added === 1 ? "PDF añadido" : "PDFs añadidos"}`);
      if (duplicates) parts.push(`${duplicates} ${duplicates === 1 ? "duplicado ignorado" : "duplicados ignorados"}`);
      if (rejected) parts.push(`${rejected} ${rejected === 1 ? "archivo rechazado" : "archivos rechazados"} por no ser PDF`);
      return `${parts.join(" · ")}.`;
    },
    archiveFilesAddedSummary: ({ archiveCount, pdfCount, pclCount, ignored }) => {
      const parts = [`${archiveCount} ZIP ${archiveCount === 1 ? "importado" : "importados"}`];
      if (pdfCount) parts.push(`${pdfCount} ${pdfCount === 1 ? "PDF encontrado" : "PDFs encontrados"}`);
      if (pclCount) parts.push(`${pclCount} ${pclCount === 1 ? "PCL encontrado" : "PCL encontrados"}`);
      if (ignored) parts.push(`${ignored} ${ignored === 1 ? "entrada ignorada" : "entradas ignoradas"}`);
      return `${parts.join(" \u00b7 ")}.`;
    },
    selectAtLeastOnePcl: "Selecciona al menos un archivo PCL.",
    pclFilesAddedSummary: ({ added, duplicates, rejected }) => {
      const parts = [];
      if (added) parts.push(`${added} ${added === 1 ? "PCL añadido" : "PCL añadidos"}`);
      if (duplicates) parts.push(`${duplicates} ${duplicates === 1 ? "duplicado ignorado" : "duplicados ignorados"}`);
      if (rejected) parts.push(`${rejected} ${rejected === 1 ? "archivo rechazado" : "archivos rechazados"} por no ser PCL`);
      return `${parts.join(" · ")}.`;
    },
    toastRemovedPcl: ({ name }) => `${name} se quitó de la lista de PCL.`,
    removedAllPclsToast: "Se quitaron todos los archivos PCL.",
    treFilesAddedSummary: ({ added, rejected }) => `${added} ${added === 1 ? "TRE añadido" : "TRE añadidos"}${rejected ? ` · ${rejected} ${rejected === 1 ? "archivo rechazado" : "archivos rechazados"} por no ser .TRE` : ""}.`,
    treFilesRemovedToast: "Se quitaron todos los archivos TRE.",
    trePclOnlyPcl: "En este apartado selecciona archivos PCL individuales, no archivos ZIP.",
    cancelledError: "El proceso fue cancelado.",
    progressOcr: "Reconociendo TRUSS con OCR",
    progressReading: "Leyendo códigos bajo TRUSS",
    progressReadingPcls: "Leyendo archivos PCL",
    readingPclDetail: ({ index, total, name }) => `PCL ${index} de ${total} · ${name}`,
    progressIndexingPdfs: "Creando índice de TRUSS",
    progressPlanningPcls: "Preparando paquetes PCL",
    progressPlanningTrePcls: "Relacionando archivos TRE con los PCL",
    planningPclDetail: ({ index, total, name }) => `Paquete ${index} de ${total} · ${name}`,
    inspectDetail: ({ fileIndex, totalFiles, name, pageNumber, totalPages }) => `Archivo ${fileIndex} de ${totalFiles} · ${name} · página ${pageNumber} de ${totalPages}`,
    progressCreating: "Creando PDFs por código",
    creatingDetail: ({ index, total, label, isUnidentified, pages }) => `Resultado ${index} de ${total} · ${isUnidentified ? "Sin identificar" : label} · ${pages} ${pages === 1 ? "hoja" : "hojas"}`,
    progressMerging: "Actualizando y combinando PDFs",
    mergingDetail: "Conservando la versión más reciente de cada código TRUSS",
    progressBuildingMerged: "Construyendo el PDF combinado",
    buildingMergedDetail: ({ index, total, name }) => `Archivo ${index} de ${total} · ${name}`,
    errorPassword: "El PDF está protegido con contraseña. Quita la protección y vuelve a intentarlo.",
    errorInvalidPdf: "El archivo no es un PDF válido o está dañado. Quítalo y selecciona otra copia.",
    errorEmptyPdf: "El PDF está vacío o no se pudo leer. Quítalo y selecciona otro archivo.",
    errorOcr: "No se pudo usar el reconocimiento OCR. Recarga la aplicación e inténtalo de nuevo.",
    errorGenericPdf: "No se pudo procesar uno de los PDFs. Comprueba que el archivo se abra correctamente y vuelve a intentarlo.",
    errorPdfTools: "No se pudieron cargar las herramientas PDF. Revisa tu conexión e inténtalo de nuevo.",
    errorOcrLoad: "No se pudo iniciar OCR. Recarga la aplicación y vuelve a intentarlo.",
    errorOcrUnavailable: "OCR no está disponible en esta versión cargada. Recarga la página antes de volver a intentarlo.",
    errorOcrTimeout: "OCR tardó demasiado en iniciar. Recarga la página y vuelve a intentarlo; si continúa, descarga el diagnóstico.",
    errorOcrInitFailed: "OCR no pudo iniciar uno de sus recursos locales. Recarga la página; si continúa, descarga el diagnóstico.",
    errorZipTool: "No se pudo cargar la herramienta ZIP. Revisa tu conexión e inténtalo de nuevo.",
    creatingZip: "Creando ZIP...",
    errorZipImport: "No se pudo abrir el ZIP. Comprueba que contenga PDFs o PCL válidos.",
    zipCreated: ({ count }) => `Se creó un ZIP con ${count} PDFs.`,
    errorZipCreate: "No se pudo crear el archivo ZIP.",
    errorPclTools: "No se pudieron cargar las herramientas PCL. Recarga la página e inténtalo de nuevo.",
    errorPclRead: "No se pudo leer uno de los archivos PCL.",
    errorPackageCreate: "No se pudo crear el paquete PCL.",
    errorTrePclRead: "No se pudieron leer los archivos PCL para organizar los TRE.",
    errorTrePclTools: "No se pudo cargar la herramienta ZIP. Recarga la página e inténtalo de nuevo.",
    errorTrePclZip: "No se pudo crear el ZIP con las carpetas TRE.",
    errorTrePclIntegrity: "No se pudo validar el resultado TRE/PCL. No se habilitó ninguna descarga.",
    masterUnavailable: "El ZIP maestro es demasiado grande para generarlo con seguridad. Descarga los paquetes individualmente.",
    summaryReviewed: "Hojas revisadas",
    summaryIdentified: "Con código",
    summaryUnidentified: "Sin identificar",
    summaryCreated: "Archivos creados",
    summaryPcls: "PCL procesados",
    summaryTres: "TRE cargados",
    summaryAvailable: "TRUSS disponibles",
    summaryMissing: "TRUSS faltantes",
    summaryConflicts: "Conflictos",
    operationSummary: ({ retained, repeated, discarded, priority }) => `<strong>Combinación completada.</strong> Se conservaron ${retained} ${retained === 1 ? "página" : "páginas"}. ${repeated} ${repeated === 1 ? "código repetido usó" : "códigos repetidos usaron"} su versión más reciente y se descartaron ${discarded} ${discarded === 1 ? "página anterior" : "páginas anteriores"}. Prioridad final: <strong>${priority}</strong>.`,
    reviewIcon: "REV",
    resultReviewMeta: ({ count }) => `${count} ${count === 1 ? "hoja" : "hojas"} sin código TRUSS detectado`,
    resultMeta: ({ count, label }) => `${count} ${count === 1 ? "hoja" : "hojas"} · ${label}`,
    download: "Descargar",
    downloadLabel: ({ name }) => `Descargar ${name}`,
    downloadPackage: "Descargar paquete",
    downloadPackageLabel: ({ name }) => `Descargar paquete ${name}`,
    viewPclReport: "Ver reporte detallado",
    downloadMaster: "Descargar ZIP maestro",
    creatingPackage: "Creando paquete...",
    packageCreated: ({ name }) => `${name}.zip está listo.`,
    masterCreated: ({ count }) =>
      `Se creó el ZIP maestro con ${count} ${count === 1 ? "paquete" : "paquetes"}.`,
    pclStatusSatisfactory: "Satisfactorio",
    pclStatusPartial: "Parcial",
    pclStatusNoMatches: "Sin coincidencias",
    pclStatusInvalid: "PCL inválido",
    pclResultMeta: ({ available, missing, conflicts }) => `${available} disponibles · ${missing} faltantes · ${conflicts} conflictos`,
    trePclResultMeta: ({ available, missing, conflicts }) => `${available} TRE incluidos · ${missing} faltantes · ${conflicts} nombres repetidos`,
    viewTrePclReport: "Ver contenido y faltantes",
    trePclCreated: ({ count, available, missing, conflicts }) => `Se prepararon ${count} carpetas PCL con ${available} TRE.${missing ? ` · ${missing} faltantes` : ""}${conflicts ? ` · ${conflicts} nombres repetidos` : ""}`,
    trePclGlobalSummary: ({ count }) => `<strong>Carpetas preparadas:</strong> ${count}. Descarga un ZIP con una carpeta por PCL.`,
    downloadTrePclZip: "Descargar ZIP de carpetas TRE",
    trePclZipCreated: ({ count }) => `Se creó un ZIP con las carpetas de ${count} PCL.`,
    trePclMasterUnavailable: "El ZIP supera el tamaño seguro para este navegador. Usa Chrome o Edge actualizado para guardarlo directamente en un archivo.",
    pclCreated: ({ count, attention }) => `${count} ${count === 1 ? "paquete preparado" : "paquetes preparados"}.${attention ? ` · ${attention} requieren revisión` : ""}`,
    pclGlobalSummary: ({ unidentified, duplicates }) => `<strong>Índice completado.</strong> ${unidentified} ${unidentified === 1 ? "página quedó" : "páginas quedaron"} sin identificar. ${duplicates} ${duplicates === 1 ? "PDF idéntico fue omitido" : "PDFs idénticos fueron omitidos"}.`,
    filterReviewCount: ({ count }) => `Sin identificar (${count})`,
    noFilterResults: "No hay resultados que coincidan con este filtro.",
    resultCount: ({ visible, total, searching }) => `Mostrando ${visible} de ${total} resultados${searching ? " encontrados" : ""}.`,
    queuedFiles: ({ count }) => `${count} ${count === 1 ? "archivo" : "archivos"} en la cola`,
    progressLoadingOcr: "Cargando OCR para el PDF",
    loadingOcrDetail: "Solo se activa porque la fuente del PDF no es legible",
    reviewSuffix: ({ count }) => ` · ${count} ${count === 1 ? "hoja necesita" : "hojas necesitan"} revisión`,
    progressFinished: "Proceso terminado",
    finishedDetail: ({ count, reviewCount }) => `${count} ${count === 1 ? "archivo listo" : "archivos listos"} para descargar${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "hoja necesita" : "hojas necesitan"} revisión` : ""}`,
    splitCreated: ({ count, reviewCount }) => `Se crearon ${count} PDFs.${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "hoja necesita" : "hojas necesitan"} revisión` : ""}`,
    mergeCreated: ({ reviewCount }) => `Se combinaron los PDFs usando la versión más reciente de cada código.${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "hoja necesita" : "hojas necesitan"} revisión` : ""}`,
    cancelledToast: "Proceso cancelado. No se generaron archivos.",
    removedAllToast: "Se quitaron todos los archivos.",
    cancellingDetail: "Terminando la operación actual de forma segura…",
    readyAgainToast: "Listo para procesar otros PDFs.",
    mergedResultLabel: "Todos los PDFs",
    unidentifiedDisplay: "Sin identificar",
    unidentifiedFile: "SIN-IDENTIFICAR.pdf",
    mergedFile: "todos-los-pdfs.pdf",
    zipFile: "pdfs-por-codigo.zip",
  },
  en: {
    metaDescription: "Organize PDF drawings and TRE files using TRUSS codes and PCLs.",
    documentTitle: "PDF Nicaes - PDF drawings and TRE files",
    brandHome: "PDF Nicaes, home",
    languageSelectorLabel: "Language",
    languageSpanishLabel: "Use Spanish",
    languageEnglishLabel: "Use English",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSwitchToLight: "Switch to light mode",
    themeSwitchToDark: "Switch to dark mode",
    privacySummary: "Local processing",
    privacyBody: "Your documents remain in this browser. Sanitized technical metadata is sent only when an incident occurs; never PDFs, TRE files, PCL files, names, TRUSS codes, or content.",
    heroEyebrow: "Technical plan tool",
    heroTitle: "Split and update PDF plans.",
    heroBody: "Detect the code below “TRUSS,” organize versions, and download ready-to-use results.",
    workflowLabel: "Workflow progress",
    stepFiles: "Files",
    stepOperation: "Operation",
    stepResults: "Results",
    workspaceLabel: "PDF, TRE, and PCL file processing",
    uploadTitle: "Add your PDF plans",
    uploadBody: "Drag them here or select them from your device.",
    selectPdfs: "Select PDFs or ZIP",
    loadExample: "Load test example",
    loadingExample: "Preparing example…",
    exampleReady: ({ action }) => `Example ready. Select “${action}” to complete the test.`,
    exampleError: "The example could not be created. Reload the page and check your connection.",
    loadedFiles: "Uploaded files",
    addPdfs: "Add PDFs",
    removeAll: "Remove all",
    queueHelp: "Order determines merge priority: place the newest version last.",
    operationKicker: "Step 2 · Operation",
    operationTitle: "What result do you need?",
    operationLegend: "Select an operation",
    splitTitle: "Split by code",
    splitBody: "Creates one PDF for each value below TRUSS.",
    splitOutcome: "Result: one PDF per TRUSS",
    mergeTitle: "Merge and update",
    mergeBody: "Keeps the newest version of each code.",
    mergeOutcome: "Result: latest version per TRUSS",
    pclModeTitle: "Generate PCL packages",
    pclModeBody: "Creates one ZIP per building with one PDF per TRUSS and a report.",
    pclOutcome: "Result: one ZIP per building",
    trePclModeTitle: "Separate TRE files by PCL",
    trePclModeBody: "Organizes requested .TRE files into one folder per PCL.",
    trePclOutcome: "Result: one ZIP with a folder per PCL",
    trePclPclUploadTitle: "Add the PCL files that list the TRE files",
    trePclPclUploadBody: "Each PCL creates a folder with the TRE files it requests.",
    trePclQueueHelp: "Each PCL becomes its own folder inside the ZIP.",
    treUploadTitle: "Add .TRE files",
    treUploadBody: "Each file whose name appears in a PCL will be included.",
    selectTres: "Select TRE files",
    loadedTres: "Uploaded TRE files",
    addTres: "Add TRE files",
    removeAllTres: "Remove all",
    showMoreTres: "Show 100 more TRE files",
    pclUploadTitle: "Add the buildings' PCL files",
    pclUploadBody: "Each PCL will generate its own ZIP package and report. You can also load a complete ZIP here.",
    selectPcls: "Select PCL files",
    loadedPcls: "Uploaded PCL files",
    addPcls: "Add PCL files",
    removeAllPcls: "Remove all",
    pclQueueHelp: "The PCL order is preserved in each package.",
    showMoreFiles: "Show 100 more PDFs",
    showMorePcls: "Show 100 more PCL files",
    addPdfsToContinue: "Add PDFs to continue",
    addPdfsAndPclsToContinue: "Add PDFs and PCL files to continue",
    processHint: "Select at least one PDF to enable this action.",
    pclProcessHint: "Select at least one PDF and one PCL file to enable this action.",
    trePclProcessHint: "Select at least one TRE file and one PCL file to enable this action.",
    localStrong: "Your documents remain on your device.",
    localBody: "Results are generated locally. If an incident occurs, only sanitized technical metadata is sent.",
    progressKicker: "Processing status",
    progressPreparing: "Preparing files",
    cancel: "Cancel",
    cancelling: "Cancelling…",
    readyToDownload: "Ready to download",
    reviewKicker: "Review required",
    reviewTitle: "Confirm the result before downloading",
    reviewHelp: "Review every unidentified page and each priority replacement. Downloads are enabled only after confirmation.",
    reviewCount: ({ count }) => `${count} ${count === 1 ? "decision" : "decisions"}`,
    reviewSourceMeta: ({ source, page }) => `${source} · page ${page}`,
    assignCode: "Assign TRUSS code",
    keepUnidentified: "Keep as SIN-IDENTIFICAR",
    codeLabel: "Exact TRUSS code",
    codePlaceholder: "Example: F01",
    keepAllUnidentified: "Keep all unidentified",
    keepAllConfirm: "This will keep every pending page as SIN-IDENTIFICAR. Do you want to continue?",
    confirmReview: "Confirm review",
    restartReview: "Back to files",
    reviewIncomplete: "You must explicitly assign or keep every unidentified page.",
    reviewCodeInvalid: "Enter an exact TRUSS code using letters, numbers, hyphens, or underscores.",
    progressReviewRequired: "Review required",
    reviewRequiredDetail: "Confirm the decisions before results are generated and downloads are enabled.",
    progressApplyingReview: "Applying review",
    applyingReviewDetail: "Recalculating results and checking their integrity.",
    reviewReplacementsTitle: "Priority replacements",
    reviewReplacement: ({ code, winner, discarded }) => `${code}: ${winner} will be kept; ${discarded} will be replaced.`,
    reviewPreviewAlt: ({ source, page }) => `Preview of ${source}, page ${page}`,
    errorReviewPreview: "A complete preview could not be generated. Downloads were not enabled; try again.",
    reviewConfirmed: "Review confirmed and results verified.",
    resultsTitle: "Results",
    downloadZip: "Download all as ZIP",
    resultsSummaryLabel: "Processing summary",
    searchByCode: "Search by code",
    searchPlaceholder: "Example: F01",
    filterResultsLabel: "Filter results",
    filterAll: "All",
    filterReview: "Unidentified",
    filterPclReview: "Needs review",
    loadMore: "Show 30 more",
    addMoreFiles: "Add more files",
    startOver: "Start over",
    footerNote: "PDF Nicaes · Private processing in your browser",
    diagnosticsKicker: "Private diagnostics",
    diagnosticsTitle: "Troubleshooting information",
    diagnosticHelp: "This report excludes PDFs, filenames, TRUSS codes, and content.",
    copyExecutionId: "Copy ID",
    downloadDiagnostic: "Download diagnostic",
    reportIncorrect: "Report incorrect result",
    recentDiagnostics: "Recent diagnostics",
    reportPreviewKicker: "Before sending",
    reportPreviewTitle: "Review the sanitized report",
    close: "Close",
    reportPreviewHelp: "These are exactly the technical fields that will be sent; the time is updated on confirmation. It contains neither your documents nor their data.",
    downloadOnly: "Download without sending",
    sendReport: "Send diagnostic",
    executionLabel: ({ id }) => `Execution · ${id}`,
    versionLabel: ({ version }) => `Version ${version}`,
    diagnosticStatusPending: "Sending diagnostic…",
    diagnosticStatusSent: "Diagnostic sent",
    diagnosticStatusNotSent: "Could not send",
    diagnosticStatusNotRequired: "Saved only in this browser",
    executionIdCopied: "Execution ID copied.",
    diagnosticDownloaded: "Diagnostic downloaded.",
    incorrectReported: "Diagnostic sent.",
    incorrectDownloaded: "Diagnostic saved without sending.",
    diagnosticOutcomeProcessing: "Processing",
    diagnosticOutcomeCompleted: "Completed",
    diagnosticOutcomeCompletedWithReview: "Completed with review",
    diagnosticOutcomeIncident: "Incident",
    diagnosticOutcomeCancelled: "Cancelled",
    processPdfs: "Process PDFs",
    progressFailed: "Processing failed",
    progressCancelled: "Process cancelled",
    progressCancelledDetail: "No partial files were generated. You can adjust the list and try again.",
    errorAria: ({ detail }) => `Error: ${detail}`,
    progressAria: ({ label, percent }) => `${label}: ${percent}%`,
    processMergeAction: ({ count }) => `Merge ${count} ${count === 1 ? "PDF" : "PDFs"}`,
    processSplitAction: ({ count }) => `Split ${count} ${count === 1 ? "PDF" : "PDFs"}`,
    processPclAction: ({ count }) => `Generate ${count} ${count === 1 ? "package" : "packages"}`,
    processTrePclAction: ({ count }) => `Organize TRE files for ${count} PCL${count === 1 ? "" : "s"}`,
    toastRemovedFile: ({ name }) => `${name} was removed from the list.`,
    toastOrderUpdated: "File order updated.",
    versionSingle: "Only file",
    versionLatest: "Newest · takes priority",
    versionFirst: "First version",
    versionMiddle: "Intermediate version",
    priorityNote: ({ name }) => `<strong>${name}</strong> is last and will take priority when a code is repeated.`,
    fileCount: ({ count }) => `${count} ${count === 1 ? "PDF" : "PDFs"}`,
    pclFileCount: ({ count }) => `${count} PCL`,
    pclFileMeta: ({ size, position, total }) => `${size} · PCL ${position} of ${total}`,
    treFileCount: ({ count }) => `${count} TRE files`,
    treFileMeta: ({ size, position, total }) => `${size} · TRE ${position} of ${total}`,
    filePosition: ({ size, position, total }) => `${size} · position ${position} of ${total}`,
    fileActions: ({ name }) => `Actions for ${name}`,
    moveUpLabel: ({ name }) => `Move ${name} up`,
    moveDownLabel: ({ name }) => `Move ${name} down`,
    removeLabel: ({ name }) => `Remove ${name}`,
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    replaceFile: "Replace file",
    selectAtLeastOnePdf: "Select at least one PDF file.",
    toastReplacedFile: ({ previous, replacement }) => `${previous} was replaced with ${replacement}.`,
    addedPdfs: ({ count }) => `${count} ${count === 1 ? "PDF added" : "PDFs added"}`,
    ignoredDuplicates: ({ count }) => `${count} ${count === 1 ? "duplicate ignored" : "duplicates ignored"}`,
    rejectedFiles: ({ count }) => `${count} non-PDF ${count === 1 ? "file was" : "files were"} rejected`,
    filesAddedSummary: ({ added, duplicates, rejected }) => {
      const parts = [];
      if (added) parts.push(`${added} ${added === 1 ? "PDF added" : "PDFs added"}`);
      if (duplicates) parts.push(`${duplicates} ${duplicates === 1 ? "duplicate ignored" : "duplicates ignored"}`);
      if (rejected) parts.push(`${rejected} non-PDF ${rejected === 1 ? "file was" : "files were"} rejected`);
      return `${parts.join(" · ")}.`;
    },
    archiveFilesAddedSummary: ({ archiveCount, pdfCount, pclCount, ignored }) => {
      const parts = [`${archiveCount} ZIP ${archiveCount === 1 ? "imported" : "imported"}`];
      if (pdfCount) parts.push(`${pdfCount} ${pdfCount === 1 ? "PDF found" : "PDFs found"}`);
      if (pclCount) parts.push(`${pclCount} ${pclCount === 1 ? "PCL found" : "PCLs found"}`);
      if (ignored) parts.push(`${ignored} ${ignored === 1 ? "entry ignored" : "entries ignored"}`);
      return `${parts.join(" \u00b7 ")}.`;
    },
    selectAtLeastOnePcl: "Select at least one PCL file.",
    pclFilesAddedSummary: ({ added, duplicates, rejected }) => {
      const parts = [];
      if (added) parts.push(`${added} ${added === 1 ? "PCL file added" : "PCL files added"}`);
      if (duplicates) parts.push(`${duplicates} ${duplicates === 1 ? "duplicate ignored" : "duplicates ignored"}`);
      if (rejected) parts.push(`${rejected} non-PCL ${rejected === 1 ? "file was" : "files were"} rejected`);
      return `${parts.join(" · ")}.`;
    },
    toastRemovedPcl: ({ name }) => `${name} was removed from the PCL list.`,
    removedAllPclsToast: "All PCL files were removed.",
    treFilesAddedSummary: ({ added, rejected }) => `${added} TRE ${added === 1 ? "file added" : "files added"}${rejected ? ` · ${rejected} ${rejected === 1 ? "file" : "files"} rejected because they are not .TRE` : ""}.`,
    treFilesRemovedToast: "All TRE files were removed.",
    trePclOnlyPcl: "Select individual PCL files in this section, not ZIP files.",
    cancelledError: "The process was cancelled.",
    progressOcr: "Recognizing TRUSS with OCR",
    progressReading: "Reading codes below TRUSS",
    progressReadingPcls: "Reading PCL files",
    readingPclDetail: ({ index, total, name }) => `PCL ${index} of ${total} · ${name}`,
    progressIndexingPdfs: "Building the TRUSS index",
    progressPlanningPcls: "Preparing PCL packages",
    progressPlanningTrePcls: "Matching TRE files to PCL requests",
    planningPclDetail: ({ index, total, name }) => `Package ${index} of ${total} · ${name}`,
    inspectDetail: ({ fileIndex, totalFiles, name, pageNumber, totalPages }) => `File ${fileIndex} of ${totalFiles} · ${name} · page ${pageNumber} of ${totalPages}`,
    progressCreating: "Creating PDFs by code",
    creatingDetail: ({ index, total, label, isUnidentified, pages }) => `Result ${index} of ${total} · ${isUnidentified ? "Unidentified" : label} · ${pages} ${pages === 1 ? "page" : "pages"}`,
    progressMerging: "Updating and merging PDFs",
    mergingDetail: "Keeping the newest version of each TRUSS code",
    progressBuildingMerged: "Building the merged PDF",
    buildingMergedDetail: ({ index, total, name }) => `File ${index} of ${total} · ${name}`,
    errorPassword: "The PDF is password-protected. Remove the protection and try again.",
    errorInvalidPdf: "The file is not a valid PDF or is damaged. Remove it and select another copy.",
    errorEmptyPdf: "The PDF is empty or could not be read. Remove it and select another file.",
    errorOcr: "OCR could not be used. Reload the application and try again.",
    errorGenericPdf: "One of the PDFs could not be processed. Make sure the file opens correctly and try again.",
    errorPdfTools: "The PDF tools could not be loaded. Check your connection and try again.",
    errorOcrLoad: "OCR could not be initialized. Reload the application and try again.",
    errorOcrUnavailable: "OCR is not available in the loaded application version. Reload the page before trying again.",
    errorOcrTimeout: "OCR took too long to initialize. Reload and try again; if it continues, download the diagnostic report.",
    errorOcrInitFailed: "OCR could not initialize one of its local resources. Reload; if it continues, download the diagnostic report.",
    errorZipTool: "The ZIP tool could not be loaded. Check your connection and try again.",
    creatingZip: "Creating ZIP...",
    errorZipImport: "The ZIP could not be opened. Make sure it contains valid PDF or PCL files.",
    zipCreated: ({ count }) => `A ZIP with ${count} PDFs was created.`,
    errorZipCreate: "The ZIP file could not be created.",
    errorPclTools: "The PCL tools could not be loaded. Reload the page and try again.",
    errorPclRead: "One of the PCL files could not be read.",
    errorPackageCreate: "The PCL package could not be created.",
    errorTrePclRead: "The PCL files could not be read to organize the TRE files.",
    errorTrePclTools: "The ZIP tool could not be loaded. Reload the page and try again.",
    errorTrePclZip: "The ZIP containing the TRE folders could not be created.",
    errorTrePclIntegrity: "The TRE/PCL result could not be validated. Downloads were not enabled.",
    masterUnavailable: "The master ZIP is too large to create safely. Download the packages individually.",
    summaryReviewed: "Pages reviewed",
    summaryIdentified: "With code",
    summaryUnidentified: "Unidentified",
    summaryCreated: "Files created",
    summaryPcls: "PCL files processed",
    summaryTres: "TRE files loaded",
    summaryAvailable: "Available TRUSS codes",
    summaryMissing: "Missing TRUSS codes",
    summaryConflicts: "Conflicts",
    operationSummary: ({ retained, repeated, discarded, priority }) => `<strong>Merge complete.</strong> ${retained} ${retained === 1 ? "page was" : "pages were"} kept. ${repeated} repeated ${repeated === 1 ? "code used" : "codes used"} the newest version, and ${discarded} earlier ${discarded === 1 ? "page was" : "pages were"} discarded. Final priority: <strong>${priority}</strong>.`,
    reviewIcon: "REV",
    resultReviewMeta: ({ count }) => `${count} ${count === 1 ? "page" : "pages"} without a detected TRUSS code`,
    resultMeta: ({ count, label }) => `${count} ${count === 1 ? "page" : "pages"} · ${label}`,
    download: "Download",
    downloadLabel: ({ name }) => `Download ${name}`,
    downloadPackage: "Download package",
    downloadPackageLabel: ({ name }) => `Download package ${name}`,
    viewPclReport: "View detailed report",
    downloadMaster: "Download master ZIP",
    creatingPackage: "Creating package...",
    packageCreated: ({ name }) => `${name}.zip is ready.`,
    masterCreated: ({ count }) =>
      `The master ZIP with ${count} ${count === 1 ? "package" : "packages"} was created.`,
    pclStatusSatisfactory: "Successful",
    pclStatusPartial: "Partial",
    pclStatusNoMatches: "No matches",
    pclStatusInvalid: "Invalid PCL",
    pclResultMeta: ({ available, missing, conflicts }) => `${available} available · ${missing} missing · ${conflicts} conflicts`,
    trePclResultMeta: ({ available, missing, conflicts }) => `${available} TRE included · ${missing} missing · ${conflicts} duplicate names`,
    viewTrePclReport: "View included files and missing names",
    trePclCreated: ({ count, available, missing, conflicts }) => `Prepared ${count} PCL folders with ${available} TRE files.${missing ? ` · ${missing} missing` : ""}${conflicts ? ` · ${conflicts} duplicate names` : ""}`,
    trePclGlobalSummary: ({ count }) => `<strong>Folders prepared:</strong> ${count}. Download one ZIP with a folder for each PCL.`,
    downloadTrePclZip: "Download TRE folders ZIP",
    trePclZipCreated: ({ count }) => `A ZIP with folders for ${count} PCL files was created.`,
    trePclMasterUnavailable: "The ZIP is too large for this browser to create safely. Use an up-to-date Chrome or Edge to save it directly to a file.",
    pclCreated: ({ count, attention }) => `${count} ${count === 1 ? "package prepared" : "packages prepared"}.${attention ? ` · ${attention} need review` : ""}`,
    pclGlobalSummary: ({ unidentified, duplicates }) => `<strong>Index complete.</strong> ${unidentified} unidentified ${unidentified === 1 ? "page" : "pages"}. ${duplicates} identical ${duplicates === 1 ? "PDF was" : "PDFs were"} omitted.`,
    filterReviewCount: ({ count }) => `Unidentified (${count})`,
    noFilterResults: "No results match this filter.",
    resultCount: ({ visible, total, searching }) => `Showing ${visible} of ${total} result${total === 1 ? "" : "s"}${searching ? " found" : ""}.`,
    queuedFiles: ({ count }) => `${count} ${count === 1 ? "file" : "files"} in the queue`,
    progressLoadingOcr: "Loading OCR for the PDF",
    loadingOcrDetail: "This is only enabled because the PDF font is not readable",
    reviewSuffix: ({ count }) => ` · ${count} ${count === 1 ? "page needs" : "pages need"} review`,
    progressFinished: "Process complete",
    finishedDetail: ({ count, reviewCount }) => `${count} ${count === 1 ? "file" : "files"} ready to download${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "page needs" : "pages need"} review` : ""}`,
    splitCreated: ({ count, reviewCount }) => `${count} PDFs were created.${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "page needs" : "pages need"} review` : ""}`,
    mergeCreated: ({ reviewCount }) => `The PDFs were merged using the newest version of each code.${reviewCount ? ` · ${reviewCount} ${reviewCount === 1 ? "page needs" : "pages need"} review` : ""}`,
    cancelledToast: "Process cancelled. No files were generated.",
    removedAllToast: "All files were removed.",
    cancellingDetail: "Safely finishing the current operation…",
    readyAgainToast: "Ready to process more PDFs.",
    mergedResultLabel: "All PDFs",
    unidentifiedDisplay: "Unidentified",
    unidentifiedFile: "UNIDENTIFIED.pdf",
    mergedFile: "all-pdfs.pdf",
    zipFile: "pdfs-by-code.zip",
  },
};

function getStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "en" || stored === "es" ? stored : "es";
  } catch {
    return "es";
  }
}

function getInitialTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Fall through to the operating-system preference when storage is unavailable.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_PATH;
}

const diagnosticTracker = window.NicaesDiagnostics?.createTracker({
  buildInfo: window.PDF_NICAES_BUILD,
  runtimeInfo: {
    diagnosticsRevision: 2,
    online: navigator.onLine !== false,
    workerSupported: typeof Worker === "function",
    wasmSupported: typeof WebAssembly === "object",
    secureContext: window.isSecureContext === true,
    crossOriginIsolated: window.crossOriginIsolated === true,
  },
});

const state = {
  language: getStoredLanguage(),
  theme: getInitialTheme(),
  files: [],
  treFiles: [],
  pclFiles: [],
  results: [],
  summary: null,
  operationSummary: null,
  pclSources: new Map(),
  pclGlobalSummary: null,
  reviewSession: null,
  reviewContext: null,
  reviewPreviewReady: false,
  reviewPreviewPending: 0,
  manualAssignmentCount: 0,
  keptUnidentifiedCount: 0,
  mode: "split",
  operationSelected: false,
  status: "idle",
  resultQuery: "",
  resultFilter: "all",
  visibleResultCount: 30,
  visibleFileCount: 100,
  visibleTreFileCount: 100,
  visiblePclFileCount: 100,
  cancelRequested: false,
  currentFileIndex: -1,
  fileIssues: new Map(),
  pendingReplaceIndex: null,
  dragIndex: null,
  busy: false,
  addingFiles: false,
  loadingExample: false,
  creatingZip: false,
  creatingPackageName: null,
  progressMessage: null,
  toastMessage: null,
  diagnosticPagesInspected: 0,
  diagnosticOcrPages: 0,
  diagnosticPagesTotal: 0,
  diagnosticDuplicatePdfCount: 0,
  diagnosticProcessedPdfCount: 0,
  diagnosticIdentifiedPages: 0,
  diagnosticUnidentifiedPages: 0,
};

const elements = {
  dropzone: document.querySelector("#dropzone"),
  uploadCard: document.querySelector(".upload-card"),
  pickFiles: document.querySelector("#pick-files"),
  loadExample: document.querySelector("#load-example"),
  fileInput: document.querySelector("#file-input"),
  filePanel: document.querySelector("#file-panel"),
  fileCount: document.querySelector("#file-count"),
  fileList: document.querySelector("#file-list"),
  clearFiles: document.querySelector("#clear-files"),
  addMoreFiles: document.querySelector("#add-more-files"),
  fileListMoreRow: document.querySelector("#file-list-more-row"),
  showMoreFiles: document.querySelector("#show-more-files"),
  queueHelp: document.querySelector("#queue-help"),
  pclUploadSection: document.querySelector("#pcl-upload-section"),
  pclFilesTitle: document.querySelector("#pcl-files-title"),
  pclUploadBody: document.querySelector("#pcl-upload-body"),
  pclDropzone: document.querySelector("#pcl-dropzone"),
  pickPclFiles: document.querySelector("#pick-pcl-files"),
  pclFileInput: document.querySelector("#pcl-file-input"),
  pclFilePanel: document.querySelector("#pcl-file-panel"),
  pclFileCount: document.querySelector("#pcl-file-count"),
  pclFileList: document.querySelector("#pcl-file-list"),
  clearPclFiles: document.querySelector("#clear-pcl-files"),
  addMorePclFiles: document.querySelector("#add-more-pcl-files"),
  pclListMoreRow: document.querySelector("#pcl-list-more-row"),
  showMorePclFiles: document.querySelector("#show-more-pcl-files"),
  treUploadSection: document.querySelector("#tre-upload-section"),
  treDropzone: document.querySelector("#tre-dropzone"),
  pickTreFiles: document.querySelector("#pick-tre-files"),
  treFileInput: document.querySelector("#tre-file-input"),
  treFilePanel: document.querySelector("#tre-file-panel"),
  treFileCount: document.querySelector("#tre-file-count"),
  treFileList: document.querySelector("#tre-file-list"),
  clearTreFiles: document.querySelector("#clear-tre-files"),
  addMoreTreFiles: document.querySelector("#add-more-tre-files"),
  treListMoreRow: document.querySelector("#tre-list-more-row"),
  showMoreTreFiles: document.querySelector("#show-more-tre-files"),
  workspace: document.querySelector("#workspace"),
  modeInputs: document.querySelectorAll('input[name="mode"]'),
  priorityNote: document.querySelector("#priority-note"),
  processButton: document.querySelector("#process-button"),
  processHint: document.querySelector("#process-hint"),
  mobileActionBar: document.querySelector("#mobile-action-bar"),
  mobileModeLabel: document.querySelector("#mobile-mode-label"),
  mobileProcessButton: document.querySelector("#mobile-process-button"),
  progressCard: document.querySelector("#progress-card"),
  progressLabel: document.querySelector("#progress-label"),
  progressPercent: document.querySelector("#progress-percent"),
  progressTrack: document.querySelector("#progress-track"),
  progressBar: document.querySelector("#progress-bar"),
  progressDetail: document.querySelector("#progress-detail"),
  cancelButton: document.querySelector("#cancel-button"),
  reviewCard: document.querySelector("#review-card"),
  reviewTitle: document.querySelector("#review-title"),
  reviewCount: document.querySelector("#review-count"),
  reviewReplacements: document.querySelector("#review-replacements"),
  reviewSuggestions: document.querySelector("#review-code-suggestions"),
  reviewList: document.querySelector("#review-list"),
  reviewValidation: document.querySelector("#review-validation"),
  keepAllUnidentified: document.querySelector("#keep-all-unidentified"),
  confirmReview: document.querySelector("#confirm-review"),
  restartReview: document.querySelector("#restart-review"),
  resultsCard: document.querySelector("#results-card"),
  resultsTitle: document.querySelector("#results-title"),
  resultsSummary: document.querySelector("#results-summary"),
  operationSummary: document.querySelector("#operation-summary"),
  resultsTools: document.querySelector("#results-tools"),
  resultSearch: document.querySelector("#result-search"),
  filterAll: document.querySelector("#filter-all"),
  filterReview: document.querySelector("#filter-review"),
  resultCount: document.querySelector("#result-count"),
  resultsList: document.querySelector("#results-list"),
  downloadAll: document.querySelector("#download-all"),
  loadMoreRow: document.querySelector("#load-more-row"),
  loadMore: document.querySelector("#load-more"),
  resultsAddMore: document.querySelector("#results-add-more"),
  startOver: document.querySelector("#start-over"),
  stepFiles: document.querySelector("#step-files"),
  stepOperation: document.querySelector("#step-operation"),
  stepResults: document.querySelector("#step-results"),
  toast: document.querySelector("#toast"),
  languageButtons: document.querySelectorAll("[data-language]"),
  themeToggle: document.querySelector("#theme-toggle"),
  diagnosticsCard: document.querySelector("#diagnostics-card"),
  diagnosticSendStatus: document.querySelector("#diagnostic-send-status"),
  executionShortId: document.querySelector("#execution-short-id"),
  copyExecutionId: document.querySelector("#copy-execution-id"),
  downloadDiagnostic: document.querySelector("#download-diagnostic"),
  reportIncorrect: document.querySelector("#report-incorrect"),
  recentDiagnostics: document.querySelector("#recent-diagnostics"),
  recentDiagnosticsList: document.querySelector("#recent-diagnostics-list"),
  appVersion: document.querySelector("#app-version"),
  diagnosticDialog: document.querySelector("#diagnostic-dialog"),
  diagnosticPreview: document.querySelector("#diagnostic-preview"),
  downloadIncidentPreview: document.querySelector("#download-incident-preview"),
  sendIncidentReport: document.querySelector("#send-incident-report"),
};

document.documentElement.dataset.theme = state.theme;

let toastTimer;
let naturalCollator = new Intl.Collator(state.language, { numeric: true, sensitivity: "base" });

function translate(language, key, params = {}) {
  const entry = translations[language]?.[key] ?? translations.es[key] ?? key;
  if (typeof entry === "function") return entry(params);
  return entry.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

function t(key, params = {}) {
  return translate(state.language, key, params);
}

function renderToastMessage() {
  if (!state.toastMessage) return;
  const { key, params, isError } = state.toastMessage;
  elements.toast.textContent = t(key, params);
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.setAttribute("role", isError ? "alert" : "status");
  elements.toast.setAttribute("aria-live", isError ? "assertive" : "polite");
}

function renderProgressMessage() {
  if (!state.progressMessage) return;
  const { labelKey, percent, detailKey, params, isError } = state.progressMessage;
  const label = t(labelKey, params);
  const detail = detailKey ? t(detailKey, params) : "";
  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  elements.progressTrack.setAttribute("aria-valuetext", isError
    ? t("errorAria", { detail })
    : t("progressAria", { label, percent: Math.round(percent) }));
  elements.progressDetail.textContent = detail;
}

function renderAppVersion() {
  const commitSha = String(window.PDF_NICAES_BUILD?.commitSha || "local-dev").toLowerCase();
  const version = /^[a-f0-9]{40}$/.test(commitSha) ? commitSha.slice(0, 7) : "local-dev";
  elements.appVersion.textContent = t("versionLabel", { version });
  elements.appVersion.title = commitSha;
}

function diagnosticOutcomeLabel(outcome) {
  const suffix = String(outcome || "processing")
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
  return t(`diagnosticOutcome${suffix}`);
}

function renderDiagnostics() {
  const current = diagnosticTracker?.getCurrent();
  elements.diagnosticsCard.hidden = !current;
  if (!current) return;
  elements.diagnosticsCard.classList.toggle("is-incident", current.outcome === "incident");

  elements.executionShortId.textContent = t("executionLabel", { id: current.executionId.slice(0, 8) });
  const statusByValue = {
    pending: "diagnosticStatusPending",
    sent: "diagnosticStatusSent",
    not_sent: "diagnosticStatusNotSent",
    not_required: "diagnosticStatusNotRequired",
  };
  elements.diagnosticSendStatus.dataset.state = current.remoteStatus.replace("_", "-");
  elements.diagnosticSendStatus.textContent = t(statusByValue[current.remoteStatus] || "diagnosticStatusNotRequired");
  elements.downloadDiagnostic.classList.toggle("is-recommended", current.remoteStatus === "not_sent");
  elements.reportIncorrect.hidden = !["completed", "completed_with_review"].includes(current.outcome);

  const reports = diagnosticTracker.getRecent();
  elements.recentDiagnostics.hidden = reports.length < 2;
  elements.recentDiagnosticsList.replaceChildren();
  for (const report of reports) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-button";
    button.dataset.executionId = report.executionId;
    button.textContent = `${report.executionId.slice(0, 8)} · ${diagnosticOutcomeLabel(report.outcome)}`;
    item.append(button);
    elements.recentDiagnosticsList.append(item);
  }
}

function downloadDiagnosticReport(report, toastKey = "diagnosticDownloaded") {
  if (!report || !diagnosticTracker) return;
  const json = diagnosticTracker.toJson(report);
  downloadBlob(new Blob([json], { type: "application/json;charset=utf-8" }), `diagnostico-${report.executionId.slice(0, 8)}.json`);
  setToast(toastKey);
}

function openIncidentPreview() {
  if (!diagnosticTracker?.getCurrent()) return;
  const preview = diagnosticTracker.previewIncident("USER_REPORTED_INCORRECT");
  elements.diagnosticPreview.textContent = JSON.stringify(preview, null, 2);
  elements.diagnosticDialog.showModal();
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    element.setAttribute("content", t(element.dataset.i18nContent));
  });
  elements.languageButtons.forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateThemeControl();
  if (state.cancelRequested) elements.cancelButton.textContent = t("cancelling");
  if (state.creatingZip) elements.downloadAll.textContent = t("creatingZip");
  renderToastMessage();
  renderProgressMessage();
  renderAppVersion();
  renderDiagnostics();
  renderFiles();
  renderPclFiles();
  renderReview();
  renderResults();
}

function updateThemeControl() {
  const isDark = state.theme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.setAttribute("aria-label", t(isDark ? "themeSwitchToLight" : "themeSwitchToDark"));
}

function setTheme(theme, persist = true) {
  if (theme !== "light" && theme !== "dark") return;
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme switching remains available even when browser storage is disabled.
    }
  }
  updateThemeControl();
}

function setLanguage(language, persist = true) {
  if (language !== "es" && language !== "en") return;
  state.language = language;
  naturalCollator = new Intl.Collator(language, { numeric: true, sensitivity: "base" });
  if (persist) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The interface still works when browser storage is unavailable.
    }
  }
  applyTranslations();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setToast(key, params = {}, isError = false) {
  window.clearTimeout(toastTimer);
  state.toastMessage = { key, params, isError };
  renderToastMessage();
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 7000);
}

function hideToast() {
  window.clearTimeout(toastTimer);
  elements.toast.classList.remove("is-visible", "is-error");
  state.toastMessage = null;
}

function setProgress(labelKey, percent, detailKey = "", params = {}) {
  const safePercent = Math.max(0, Math.min(100, percent));
  elements.progressCard.hidden = false;
  elements.progressCard.classList.remove("is-error", "is-cancelled");
  state.progressMessage = { labelKey, percent: safePercent, detailKey, params, isError: false };
  renderProgressMessage();
  elements.progressTrack.setAttribute("aria-valuenow", String(Math.round(safePercent)));
  elements.progressBar.style.width = `${safePercent}%`;
}

function setProgressError(detailKey) {
  setProgress("progressFailed", 0, detailKey);
  state.progressMessage.isError = true;
  renderProgressMessage();
  elements.progressCard.classList.add("is-error");
  elements.cancelButton.hidden = true;
}

function setProgressCancelled() {
  setProgress("progressCancelled", 0, "progressCancelledDetail");
  elements.progressCard.classList.add("is-cancelled");
  elements.cancelButton.hidden = true;
}

function finishProgress() {
  elements.progressCard.hidden = true;
  elements.progressCard.classList.remove("is-error", "is-cancelled");
  elements.progressBar.style.width = "0";
  elements.progressTrack.setAttribute("aria-valuenow", "0");
  elements.progressTrack.removeAttribute("aria-valuetext");
  state.progressMessage = null;
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function modeCopy() {
  const count = state.files.length;
  if (state.mode === "tre-pcl") {
    return {
      short: t("trePclModeTitle"),
      action: state.treFiles.length && state.pclFiles.length
        ? t("processTrePclAction", { count: state.pclFiles.length })
        : t("trePclProcessHint"),
    };
  }
  if (state.mode === "pcl") {
    return {
      short: t("pclModeTitle"),
      action: count && state.pclFiles.length
        ? t("processPclAction", { count: state.pclFiles.length })
        : t("addPdfsAndPclsToContinue"),
    };
  }
  if (state.mode === "merge") {
    return {
      short: t("mergeTitle"),
      action: count ? t("processMergeAction", { count }) : t("addPdfsToContinue"),
    };
  }
  return {
    short: t("splitTitle"),
    action: count ? t("processSplitAction", { count }) : t("addPdfsToContinue"),
  };
}

function setStepState(element, value) {
  element.dataset.state = value;
  if (value === "current") element.setAttribute("aria-current", "step");
  else element.removeAttribute("aria-current");
}

function renderWorkflow() {
  const hasFiles = state.files.length > 0 || state.treFiles.length > 0 || state.pclFiles.length > 0;
  const hasResults = state.results.length > 0;
  const choosingOperation = !hasResults && (hasFiles || state.operationSelected);
  setStepState(elements.stepFiles, hasFiles ? "complete" : choosingOperation ? "pending" : "current");
  setStepState(elements.stepOperation, hasResults ? "complete" : choosingOperation ? "current" : "pending");
  setStepState(elements.stepResults, hasResults ? "current" : "pending");
  elements.uploadCard.classList.toggle("has-files", hasFiles);
}

function isLocked() {
  return state.busy
    || state.addingFiles
    || state.loadingExample
    || state.creatingZip
    || Boolean(state.creatingPackageName)
    || Boolean(state.reviewSession);
}

function updateControls() {
  elements.uploadCard.classList.toggle("is-tre-pcl", state.mode === "tre-pcl");
  const hasRequiredFiles = state.mode === "tre-pcl"
    ? state.treFiles.length > 0 && state.pclFiles.length > 0
    : state.files.length > 0 && (state.mode !== "pcl" || state.pclFiles.length > 0);
  const locked = isLocked();
  const disabled = locked || !hasRequiredFiles;
  const copy = modeCopy();
  elements.processButton.disabled = disabled;
  elements.mobileProcessButton.disabled = disabled;
  elements.processButton.textContent = copy.action;
  elements.mobileProcessButton.textContent = copy.action;
  elements.mobileModeLabel.textContent = copy.short;
  elements.processHint.textContent = t(state.mode === "tre-pcl"
    ? "trePclProcessHint"
    : state.mode === "pcl" ? "pclProcessHint" : "processHint");
  elements.processHint.hidden = hasRequiredFiles;
  elements.mobileActionBar.hidden = !hasRequiredFiles || locked || state.results.length > 0;
  elements.clearFiles.disabled = locked || state.files.length === 0;
  elements.pickFiles.disabled = locked;
  elements.loadExample.disabled = locked;
  elements.loadExample.hidden = state.mode === "tre-pcl" || state.files.length > 0 || state.pclFiles.length > 0 || state.treFiles.length > 0;
  elements.loadExample.textContent = t(state.loadingExample ? "loadingExample" : "loadExample");
  elements.addMoreFiles.disabled = locked;
  elements.resultsAddMore.disabled = locked;
  elements.startOver.disabled = locked;
  elements.showMoreFiles.disabled = locked;
  elements.pickPclFiles.disabled = locked;
  elements.addMorePclFiles.disabled = locked;
  elements.showMorePclFiles.disabled = locked;
  elements.clearPclFiles.disabled = locked || state.pclFiles.length === 0;
  elements.pickTreFiles.disabled = locked;
  elements.addMoreTreFiles.disabled = locked;
  elements.clearTreFiles.disabled = locked || state.treFiles.length === 0;
  elements.showMoreTreFiles.disabled = locked;
  elements.modeInputs.forEach((input) => { input.disabled = locked; });
  elements.cancelButton.hidden = !state.busy;
  elements.fileList.querySelectorAll("button").forEach((button) => {
    const blockedByPosition = button.hasAttribute("data-position-disabled");
    button.disabled = locked || blockedByPosition;
  });
  elements.pclFileList.querySelectorAll("button").forEach((button) => {
    button.disabled = locked;
  });
  elements.treFileList.querySelectorAll("button").forEach((button) => {
    button.disabled = locked;
  });
  elements.resultsList.querySelectorAll(".download-button").forEach((button) => {
    button.disabled = locked;
  });
  const reviewPreviewBlocked = state.busy || state.reviewPreviewPending > 0 || !state.reviewPreviewReady;
  elements.confirmReview.disabled = reviewPreviewBlocked;
  elements.keepAllUnidentified.disabled = reviewPreviewBlocked;
  elements.restartReview.disabled = state.busy;
  elements.reviewList.querySelectorAll("input").forEach((input) => {
    input.disabled = reviewPreviewBlocked;
  });
  elements.fileList.querySelectorAll(".file-item").forEach((item) => {
    item.draggable = !locked && state.mode !== "pcl" && state.mode !== "tre-pcl";
  });
  elements.workspace.setAttribute("aria-busy", String(
    state.busy || state.addingFiles || state.loadingExample,
  ));
  elements.dropzone.hidden = state.mode === "tre-pcl";
  elements.filePanel.hidden = state.mode === "tre-pcl" || state.files.length === 0;
  elements.pclUploadSection.hidden = state.mode !== "pcl" && state.mode !== "tre-pcl";
  elements.pclFilesTitle.textContent = t(state.mode === "tre-pcl" ? "trePclPclUploadTitle" : "pclUploadTitle");
  elements.pclUploadBody.textContent = t(state.mode === "tre-pcl" ? "trePclPclUploadBody" : "pclUploadBody");
  elements.pclFileInput.accept = state.mode === "tre-pcl"
    ? ".pcl,application/octet-stream,text/plain"
    : ".pcl,application/octet-stream,text/plain,.zip,application/zip";
  elements.pclFileCount.closest(".pcl-file-panel").querySelector(".queue-help").textContent = t(
    state.mode === "tre-pcl" ? "trePclQueueHelp" : "pclQueueHelp",
  );
  elements.treUploadSection.hidden = state.mode !== "tre-pcl";
  renderWorkflow();
}

function clearOutput() {
  state.results = [];
  state.summary = null;
  state.operationSummary = null;
  state.pclSources = new Map();
  state.pclGlobalSummary = null;
  state.reviewSession = null;
  state.reviewContext = null;
  state.reviewPreviewReady = false;
  state.reviewPreviewPending = 0;
  state.manualAssignmentCount = 0;
  state.keptUnidentifiedCount = 0;
  state.resultQuery = "";
  state.resultFilter = "all";
  state.visibleResultCount = 30;
  if (!state.busy) state.status = state.files.length || state.treFiles.length || state.pclFiles.length ? "ready" : "idle";
  elements.resultsCard.hidden = true;
  elements.reviewCard.hidden = true;
  elements.reviewList.replaceChildren();
  elements.reviewReplacements.replaceChildren();
  elements.reviewValidation.hidden = true;
  elements.resultsSummary.replaceChildren();
  elements.resultsList.replaceChildren();
  elements.operationSummary.hidden = true;
  elements.resultSearch.value = "";
  finishProgress();
}

function removeFile(index) {
  if (isLocked()) return;
  const [removed] = state.files.splice(index, 1);
  if (removed) state.fileIssues.delete(fileKey(removed));
  clearOutput();
  renderFiles();
  if (removed) setToast("toastRemovedFile", { name: removed.name });
}

function moveFile(index, direction) {
  if (isLocked()) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= state.files.length) return;
  [state.files[index], state.files[targetIndex]] = [state.files[targetIndex], state.files[index]];
  clearOutput();
  renderFiles();
  const movedButton = elements.fileList.querySelector(`[data-file-index="${targetIndex}"] .file-move-${direction < 0 ? "up" : "down"}`);
  movedButton?.focus();
  setToast("toastOrderUpdated");
}

function moveFileTo(index, targetIndex) {
  if (isLocked() || index === null || index === targetIndex || index < 0 || targetIndex < 0) return;
  const [file] = state.files.splice(index, 1);
  state.files.splice(targetIndex, 0, file);
  clearOutput();
  renderFiles();
  setToast("toastOrderUpdated");
}

function versionLabel(index) {
  if (state.files.length === 1) return t("versionSingle");
  if (index === state.files.length - 1) return t("versionLatest");
  if (index === 0) return t("versionFirst");
  return t("versionMiddle");
}

function replaceFile(index) {
  if (isLocked()) return;
  state.pendingReplaceIndex = index;
  elements.fileInput.click();
}

function renderPriorityNote() {
  const show = state.mode === "merge" && state.files.length > 0;
  elements.priorityNote.hidden = !show;
  if (!show) return;
  const priorityFile = state.files.at(-1);
  elements.priorityNote.innerHTML = t("priorityNote", { name: escapeHtml(priorityFile.name) });
}

function renderFiles() {
  elements.filePanel.hidden = state.mode === "tre-pcl" || state.files.length === 0;
  elements.fileCount.textContent = t("fileCount", { count: state.files.length });
  elements.fileList.replaceChildren();
  elements.queueHelp.hidden = state.mode === "pcl" || state.mode === "tre-pcl";

  state.files.slice(0, state.visibleFileCount).forEach((file, index) => {
    const issue = state.fileIssues.get(fileKey(file));
    const item = document.createElement("li");
    item.className = `file-item${issue ? " is-error" : ""}`;
    item.dataset.fileIndex = String(index);
    item.draggable = !isLocked() && state.mode !== "pcl" && state.mode !== "tre-pcl";
    item.innerHTML = `
      <span class="file-icon" aria-hidden="true">PDF</span>
      <span class="file-info">
        <span class="file-name" title="${escapeAttribute(file.name)}">${escapeHtml(file.name)}</span>
        <span class="file-meta">
          <span>${t("filePosition", { size: formatBytes(file.size), position: index + 1, total: state.files.length })}</span>
          ${state.mode === "pcl" || state.mode === "tre-pcl" ? "" : `<span class="version-badge${index === state.files.length - 1 ? " is-priority" : ""}">${versionLabel(index)}</span>`}
        </span>
      </span>
      <span class="file-actions" role="group" aria-label="${escapeAttribute(t("fileActions", { name: file.name }))}">
        ${state.mode === "pcl" || state.mode === "tre-pcl" ? "" : `<button class="file-control file-move-up" type="button" aria-label="${escapeAttribute(t("moveUpLabel", { name: file.name }))}" ${index === 0 ? 'data-position-disabled="true" disabled' : ""}>${t("moveUp")}</button>`}
        ${state.mode === "pcl" || state.mode === "tre-pcl" ? "" : `<button class="file-control file-move-down" type="button" aria-label="${escapeAttribute(t("moveDownLabel", { name: file.name }))}" ${index === state.files.length - 1 ? 'data-position-disabled="true" disabled' : ""}>${t("moveDown")}</button>`}
        <button class="file-control file-remove" type="button" aria-label="${escapeAttribute(t("removeLabel", { name: file.name }))}">${t("remove")}</button>
      </span>
      ${issue ? `<div class="file-issue"><span>${escapeHtml(t(issue))}</span><button class="secondary-button file-replace" type="button">${t("replaceFile")}</button></div>` : ""}
    `;
    item.querySelector(".file-move-up")?.addEventListener("click", () => moveFile(index, -1));
    item.querySelector(".file-move-down")?.addEventListener("click", () => moveFile(index, 1));
    item.querySelector(".file-remove").addEventListener("click", () => removeFile(index));
    item.querySelector(".file-replace")?.addEventListener("click", () => replaceFile(index));
    item.addEventListener("dragstart", () => {
      state.dragIndex = index;
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (state.dragIndex !== index) item.classList.add("is-drag-target");
    });
    item.addEventListener("dragleave", () => item.classList.remove("is-drag-target"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("is-drag-target");
      moveFileTo(state.dragIndex, index);
    });
    item.addEventListener("dragend", () => {
      state.dragIndex = null;
      elements.fileList.querySelectorAll(".file-item").forEach((row) => {
        row.classList.remove("is-dragging", "is-drag-target");
      });
    });
    elements.fileList.append(item);
  });
  elements.fileListMoreRow.hidden = state.visibleFileCount >= state.files.length;

  renderPriorityNote();
  updateControls();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function filesAreByteIdentical(left, right) {
  if (left.size !== right.size) return false;
  const [leftBytes, rightBytes] = await Promise.all([
    left.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
    right.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
  ]);
  return byteArraysEqual(leftBytes, rightBytes);
}

function isZipFile(file) {
  return file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip");
}

async function importArchiveFiles(archives) {
  const imported = {
    archiveCount: 0,
    pdfFiles: [],
    pclFiles: [],
    ignoredEntries: 0,
  };
  for (const archive of archives) {
    let result;
    try {
      result = await window.PdfNicaesArchive.extractZipFile(archive);
    } catch (error) {
      if (error?.diagnosticCode === "ZIP_TOOL_UNAVAILABLE") throw error;
      const wrapped = new Error(t("errorZipImport"));
      wrapped.diagnosticCode = error?.diagnosticCode || "ZIP_IMPORT_FAILED";
      wrapped.cause = error;
      throw wrapped;
    }
    imported.archiveCount += 1;
    imported.pdfFiles.push(...result.pdfFiles);
    imported.pclFiles.push(...result.pclFiles);
    imported.ignoredEntries += result.ignoredEntries;
  }
  return imported;
}

async function addFiles(fileList, replaceIndex = null) {
  if (isLocked()) return;
  const selected = Array.from(fileList);
  const directPdfs = selected.filter((file) =>
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
  );
  const archives = replaceIndex === null
    ? selected.filter((file) => !directPdfs.includes(file) && isZipFile(file))
    : [];
  const rejectedCount = selected.length - directPdfs.length - archives.length;

  if (directPdfs.length === 0 && archives.length === 0) {
    setToast("selectAtLeastOnePdf", {}, true);
    return;
  }

  state.addingFiles = true;
  updateControls();
  try {
    let imported = { archiveCount: 0, pdfFiles: [], pclFiles: [], ignoredEntries: 0 };
    if (archives.length) {
      try {
        if (!window.PdfNicaesArchive) {
          const error = new Error(t("errorZipTool"));
          error.diagnosticCode = "ZIP_TOOL_UNAVAILABLE";
          throw error;
        }
        imported = await importArchiveFiles(archives);
      } catch (error) {
        setToast(
          error?.diagnosticCode === "ZIP_TOOL_UNAVAILABLE" ? "errorZipTool" : "errorZipImport",
          {},
          true,
        );
        return;
      }
    }
    const incoming = [...directPdfs, ...imported.pdfFiles];
    const incomingPcls = imported.pclFiles;
    if (incoming.length === 0 && incomingPcls.length === 0) {
      setToast("selectAtLeastOnePdf", {}, true);
      return;
    }

    if (replaceIndex !== null && state.files[replaceIndex]) {
      const replacement = directPdfs[0];
      const previous = state.files[replaceIndex];
      state.fileIssues.delete(fileKey(previous));
      state.files[replaceIndex] = replacement;
      clearOutput();
      renderFiles();
      setToast("toastReplacedFile", { previous: previous.name, replacement: replacement.name });
      return;
    }

    const classified = [];
    for (const file of incoming) {
      const metadataMatches = state.files.filter((existing) => fileKey(existing) === fileKey(file));
      let duplicateOf = null;
      for (const existing of metadataMatches) {
        if (await filesAreByteIdentical(existing, file)) {
          duplicateOf = existing.name;
          break;
        }
      }
      classified.push({ file, duplicateOf });
    }

    const preserveCompletedResults = state.results.length > 0
      && incomingPcls.length === 0
      && classified.every((item) => item.duplicateOf);
    let addedCount = 0;
    let duplicateCount = 0;
    if (preserveCompletedResults) {
      duplicateCount = classified.length;
      if (state.mode === "pcl" && state.pclGlobalSummary) {
        state.pclGlobalSummary.duplicatePdfs.push(...classified.map((item) => ({
          name: item.file.name,
          duplicateOf: item.duplicateOf,
        })));
        renderResults();
      }
    } else {
      state.files.push(...classified.map((item) => item.file));
      addedCount = classified.length;
    }
    if (incomingPcls.length > 0) state.pclFiles.push(...incomingPcls);
    if (addedCount > 0 || incomingPcls.length > 0) clearOutput();
    renderFiles();
    renderPclFiles();
    if (imported.archiveCount) {
      setToast("archiveFilesAddedSummary", {
        archiveCount: imported.archiveCount,
        pdfCount: imported.pdfFiles.length,
        pclCount: imported.pclFiles.length,
        ignored: imported.ignoredEntries + rejectedCount,
      }, false);
    } else if (addedCount || duplicateCount || rejectedCount) {
      setToast("filesAddedSummary", {
        added: addedCount,
        duplicates: duplicateCount,
        rejected: rejectedCount,
      }, rejectedCount > 0);
    }
  } finally {
    state.addingFiles = false;
    updateControls();
  }
}

async function createExamplePdf(name, codes) {
  const { PDFDocument, StandardFonts } = window.PDFLib || {};
  if (!PDFDocument || !StandardFonts) throw new Error("PDF tools unavailable");

  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (const code of codes) {
    const page = document.addPage([612, 792]);
    page.drawText("TRUSS", { x: 72, y: 742, size: 12, font: bold });
    page.drawText(code, { x: 72, y: 716, size: 18, font: bold });
    page.drawText("PDF Nicaes - archivo de prueba", { x: 72, y: 660, size: 12, font: regular });
    page.drawText(`Resultado esperado: ${code}`, { x: 72, y: 640, size: 11, font: regular });
  }
  const bytes = await document.save();
  return new File([bytes], name, { type: "application/pdf", lastModified: Date.now() });
}

async function loadExampleFiles() {
  if (isLocked() || state.files.length > 0 || state.pclFiles.length > 0) return;
  state.loadingExample = true;
  updateControls();

  let pdfs;
  try {
    const definitions = state.mode === "merge"
      ? [
        { name: "Ejemplo-base.pdf", codes: ["F01", "F02"] },
        { name: "Ejemplo-actualizacion.pdf", codes: ["F02", "F03"] },
      ]
      : [{ name: "Ejemplo-PDF-Nicaes.pdf", codes: ["F01", "F02"] }];
    pdfs = await Promise.all(definitions.map(({ name, codes }) => createExamplePdf(name, codes)));
  } catch {
    setToast("exampleError", {}, true);
    return;
  } finally {
    state.loadingExample = false;
    updateControls();
  }

  await addFiles(pdfs);
  if (state.mode === "pcl") {
    addPclFiles([new File([
      "2 2\r\nC:\\F01.tre 1 1\r\nC:\\F02.tre 1 1\r\n",
    ], "Ejemplo-Edificio.PCL", { type: "text/plain", lastModified: Date.now() })]);
  }
  setToast("exampleReady", { action: modeCopy().action });
}

function removePclFile(index) {
  if (isLocked()) return;
  const [removed] = state.pclFiles.splice(index, 1);
  clearOutput();
  renderPclFiles();
  if (removed) setToast("toastRemovedPcl", { name: removed.name });
}

function renderPclFiles() {
  elements.pclFilePanel.hidden = state.pclFiles.length === 0;
  elements.pclFileCount.textContent = t("pclFileCount", { count: state.pclFiles.length });
  elements.pclFileList.replaceChildren();

  state.pclFiles.slice(0, state.visiblePclFileCount).forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "file-item pcl-file-item";
    item.innerHTML = `
      <span class="file-icon" aria-hidden="true">PCL</span>
      <span class="file-info">
        <span class="file-name" title="${escapeAttribute(file.name)}">${escapeHtml(file.name)}</span>
        <span class="file-meta">${t("pclFileMeta", {
          size: formatBytes(file.size),
          position: index + 1,
          total: state.pclFiles.length,
        })}</span>
      </span>
      <span class="file-actions" role="group" aria-label="${escapeAttribute(t("fileActions", { name: file.name }))}">
        <button class="file-control file-remove" type="button" aria-label="${escapeAttribute(t("removeLabel", { name: file.name }))}">${t("remove")}</button>
      </span>
    `;
    item.querySelector(".file-remove").addEventListener("click", () => removePclFile(index));
    elements.pclFileList.append(item);
  });
  elements.pclListMoreRow.hidden = state.visiblePclFileCount >= state.pclFiles.length;

  updateControls();
}

function removeTreFile(index) {
  if (isLocked()) return;
  const [removed] = state.treFiles.splice(index, 1);
  clearOutput();
  renderTreFiles();
  if (removed) setToast("toastRemovedFile", { name: removed.name });
}

function renderTreFiles() {
  elements.treFilePanel.hidden = state.treFiles.length === 0;
  elements.treFileCount.textContent = t("treFileCount", { count: state.treFiles.length });
  elements.treFileList.replaceChildren();
  state.treFiles.slice(0, state.visibleTreFileCount).forEach((file, index) => {
    const item = document.createElement("li");
    item.className = "file-item tre-file-item";
    item.innerHTML = `
      <span class="file-icon" aria-hidden="true">TRE</span>
      <span class="file-info">
        <span class="file-name" title="${escapeAttribute(file.name)}">${escapeHtml(file.name)}</span>
        <span class="file-meta">${t("treFileMeta", { size: formatBytes(file.size), position: index + 1, total: state.treFiles.length })}</span>
      </span>
      <span class="file-actions" role="group" aria-label="${escapeAttribute(t("fileActions", { name: file.name }))}">
        <button class="file-control file-remove" type="button" aria-label="${escapeAttribute(t("removeLabel", { name: file.name }))}">${t("remove")}</button>
      </span>
    `;
    item.querySelector(".file-remove").addEventListener("click", () => removeTreFile(index));
    elements.treFileList.append(item);
  });
  elements.treListMoreRow.hidden = state.visibleTreFileCount >= state.treFiles.length;
  updateControls();
}

function addTreFiles(fileList) {
  if (isLocked()) return;
  const selected = Array.from(fileList);
  const incoming = selected.filter((file) => file.name.toLowerCase().endsWith(".tre"));
  const rejected = selected.length - incoming.length;
  if (!incoming.length) {
    setToast("treFilesAddedSummary", { added: 0, rejected }, true);
    return;
  }
  state.treFiles.push(...incoming);
  clearOutput();
  renderTreFiles();
  setToast("treFilesAddedSummary", { added: incoming.length, rejected }, rejected > 0);
}

async function addPclFiles(fileList) {
  if (isLocked()) return;
  const selected = Array.from(fileList);
  const archives = selected.filter(isZipFile);
  if (archives.length) {
    if (state.mode === "tre-pcl") {
      setToast("trePclOnlyPcl", {}, true);
      return;
    }
    await addFiles(archives);
    const directPcls = selected.filter((file) => !isZipFile(file));
    if (directPcls.length) await addPclFiles(directPcls);
    return;
  }
  const incoming = selected.filter((file) => file.name.toLowerCase().endsWith(".pcl"));
  const rejectedCount = selected.length - incoming.length;
  if (incoming.length === 0) {
    setToast("selectAtLeastOnePcl", {}, true);
    return;
  }

  state.pclFiles.push(...incoming);
  const addedCount = incoming.length;
  const duplicateCount = 0;
  if (addedCount > 0) clearOutput();
  renderPclFiles();
  setToast("pclFilesAddedSummary", {
    added: addedCount,
    duplicates: duplicateCount,
    rejected: rejectedCount,
  }, rejectedCount > 0);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function lineFromItem(item) {
  const transform = item.transform || [];
  const x = Number(transform[4] || 0);
  const y = Number(transform[5] || 0);
  const height = Math.abs(Number(transform[3] || item.height || 10));
  const width = Number(item.width || 0);
  return { text: item.str.trim(), x, y, width, height, xEnd: x + width };
}

function makeTextLines(items) {
  const lines = [];
  for (const item of items.map(lineFromItem).filter((entry) => entry.text)) {
    const tolerance = Math.max(2.5, item.height * 0.45);
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
    line.y = line.items.reduce((sum, entry) => sum + entry.y, 0) / line.items.length;
  }

  return lines
    .map((line) => {
      line.items.sort((a, b) => a.x - b.x);
      const first = line.items[0];
      const last = line.items[line.items.length - 1];
      return {
        text: normalizeWhitespace(line.items.map((item) => item.text).join(" ")),
        compactText: normalizeWhitespace(line.items.map((item) => item.text).join("")),
        xMin: first.x,
        xMax: last.xEnd,
        y: line.y,
        height: Math.max(...line.items.map((item) => item.height)),
      };
    })
    .sort((a, b) => b.y - a.y);
}

function isInTrussHeader(entry, pageHeight) {
  return !Number.isFinite(pageHeight) || entry.y >= pageHeight * 0.65;
}

function findLabelFromItems(items, pageHeight) {
  const entries = items.map(lineFromItem).filter((entry) => entry.text);
  const trussItems = entries
    .filter((entry) => /\btruss\b/i.test(entry.text) && isInTrussHeader(entry, pageHeight))
    .sort((left, right) => {
      const leftIsExactHeading = /^truss\s*[:|\-]?$/i.test(normalizeWhitespace(left.text));
      const rightIsExactHeading = /^truss\s*[:|\-]?$/i.test(normalizeWhitespace(right.text));
      return Number(rightIsExactHeading) - Number(leftIsExactHeading) || right.y - left.y;
    });
  for (const trussItem of trussItems) {
    const sameLineTail = normalizeWhitespace(trussItem.text.replace(/.*?\btruss\b/i, ""));
    if (/^type$/i.test(sameLineTail)) continue;
    const sameLineLabel = extractWholeCode(sameLineTail);
    if (sameLineLabel !== "SIN-IDENTIFICAR") return sameLineLabel;

    const center = trussItem.x + trussItem.width / 2;
    const maxDistance = Math.max(70, trussItem.height * 8);
    const candidates = entries
      .filter((entry) => {
        const distance = trussItem.y - entry.y;
        const sameColumn = Math.abs(entry.x + entry.width / 2 - center) <= Math.max(28, trussItem.width * 1.5);
        return distance > 1 && distance <= maxDistance && sameColumn && !/\btruss\b/i.test(entry.text);
      })
      .sort((a, b) => (trussItem.y - a.y) - (trussItem.y - b.y));
    if (!candidates[0]) continue;

    const rowY = candidates[0].y;
    const rowTolerance = Math.max(3, candidates[0].height * 0.5);
    const rowText = candidates
      .filter((entry) => Math.abs(entry.y - rowY) <= rowTolerance)
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.text)
      .join(" ");
    const label = extractWholeCode(rowText);
    if (label !== "SIN-IDENTIFICAR") return label;
  }
  return "SIN-IDENTIFICAR";
}

function extractWholeCode(value) {
  const normalized = normalizeWhitespace(value)
    .replace(/^[:|]\s*/, "")
    .replace(/[.]+$/g, "")
    .trim();
  return /^[A-Z0-9_-]+$/i.test(normalized) ? normalized.toUpperCase() : "SIN-IDENTIFICAR";
}

function extractCodeToken(value) {
  const normalized = normalizeWhitespace(value).replace(/^[:|]+|[:|]+$/g, "");
  if (!normalized) return "SIN-IDENTIFICAR";

  const tokens = normalized.split(/\s+/);
  for (const token of tokens) {
    const code = extractWholeCode(token.replace(/^[(),.;:]+|[(),.;:]+$/g, ""));
    if (code !== "SIN-IDENTIFICAR" && /[A-Z]/i.test(code) && /\d/.test(code)) return code;
  }

  if (tokens.length <= 3 && tokens.every((token) => /^[A-Z0-9_-]{1,3}$/i.test(token))) {
    const compactCode = extractWholeCode(tokens.join(""));
    if (compactCode !== "SIN-IDENTIFICAR" && /[A-Z]/i.test(compactCode) && /\d/.test(compactCode)) {
      return compactCode;
    }
  }
  return "SIN-IDENTIFICAR";
}

function extractCode(value) {
  const normalized = normalizeWhitespace(value).replace(/^[-:|]+|[-:|]+$/g, "");
  if (!normalized) return "SIN-IDENTIFICAR";
  const code = extractCodeToken(normalized);
  return code !== "SIN-IDENTIFICAR"
    ? code
    : normalized.toUpperCase().replace(/^[.\-_]+|[.\-_]+$/g, "");
}

function findLabelInLines(lines, pageHeight) {
  const trussLines = lines.filter((line) =>
    isInTrussHeader(line, pageHeight)
      && (/\btruss\b/i.test(line.text) || /truss/i.test(line.compactText)),
  );
  for (const trussLine of trussLines) {
    const sameLine = trussLine.text.match(/\btruss\b\s*[:|\-]?\s*(.+)$/i);
    if (sameLine && normalizeWhitespace(sameLine[1])) {
      const sameLineCode = extractCodeToken(sameLine[1]);
      if (sameLineCode !== "SIN-IDENTIFICAR") return sameLineCode;
    }

    const compactTrussIndex = trussLine.compactText.toLowerCase().indexOf("truss");
    if (compactTrussIndex >= 0) {
      const compactTail = trussLine.compactText.slice(compactTrussIndex + "truss".length);
      const compactCode = extractCodeToken(compactTail);
      if (compactCode !== "SIN-IDENTIFICAR") return compactCode;
    }

    const maxDistance = Math.max(70, trussLine.height * 8);
    const candidates = lines
      .filter((line) => {
        const distance = trussLine.y - line.y;
        const horizontallyAligned = line.xMax >= trussLine.xMin - 120 && line.xMin <= trussLine.xMax + 120;
        const isTrussLine = /\btruss\b/i.test(line.text) || /truss/i.test(line.compactText);
        return distance > 1 && distance <= maxDistance && horizontallyAligned && !isTrussLine;
      })
      .sort((a, b) => (trussLine.y - a.y) - (trussLine.y - b.y));

    if (candidates[0]) return extractWholeCode(candidates[0].text);
  }
  return "SIN-IDENTIFICAR";
}

function findLabelInItemSequence(items, pageHeight) {
  const textItems = items
    .filter((item) => isInTrussHeader(lineFromItem(item), pageHeight))
    .map((item) => normalizeWhitespace(item.str || ""))
    .filter(Boolean);
  const joinedText = textItems.join(" ");
  const trussIndex = joinedText.toLowerCase().indexOf("truss");
  if (trussIndex < 0) return "SIN-IDENTIFICAR";

  const afterTruss = joinedText.slice(trussIndex + "truss".length, trussIndex + 180);
  const sequenceLabel = extractCodeToken(afterTruss);
  if (sequenceLabel !== "SIN-IDENTIFICAR") return sequenceLabel;

  const compactText = textItems.join("");
  const compactIndex = compactText.toLowerCase().indexOf("truss");
  if (compactIndex >= 0) {
    const compactLabel = extractCodeToken(compactText.slice(compactIndex + "truss".length, compactIndex + 180));
    if (compactLabel !== "SIN-IDENTIFICAR") return compactLabel;
  }
  return "SIN-IDENTIFICAR";
}

function decodeCustomFontText(value) {
  return Array.from(value || "", (character) => {
    const code = character.charCodeAt(0);
    return code <= 99 ? String.fromCharCode(code + 29) : character;
  }).join("");
}

async function detectPageLabel(page) {
  const content = await page.getTextContent({ disableCombineTextItems: false });
  const items = content.items || [];
  const pageHeight = page.getViewport({ scale: 1 }).height;
  const headerText = items
    .filter((item) => isInTrussHeader(lineFromItem(item), pageHeight))
    .map((item) => normalizeWhitespace(item.str || ""))
    .join(" ");
  const ambiguous = /\btruss\b/i.test(headerText) && /\btruss\s+type\b/i.test(headerText);
  const itemLabel = findLabelFromItems(items, pageHeight);
  if (itemLabel !== "SIN-IDENTIFICAR") return { label: itemLabel, strategy: "tableHeader", ambiguous };
  const lineLabel = findLabelInLines(makeTextLines(items), pageHeight);
  if (lineLabel !== "SIN-IDENTIFICAR") return { label: lineLabel, strategy: "adjacentText", ambiguous };
  const sequenceLabel = findLabelInItemSequence(items, pageHeight);
  if (sequenceLabel !== "SIN-IDENTIFICAR") return { label: sequenceLabel, strategy: "mitekFallback", ambiguous };

  // pruebajhoziel.pdf uses a custom font without a ToUnicode map:
  // PDF.js returns 7UXVV for the visible word "Truss" and shifted characters for F01.
  const usesShiftedFont = items.some((item) => String(item.str || "").includes("7UXVV"));
  if (usesShiftedFont) {
    const decodedItems = items.map((item) => ({ ...item, str: decodeCustomFontText(item.str) }));
    const decodedItemLabel = findLabelFromItems(decodedItems, pageHeight);
    if (decodedItemLabel !== "SIN-IDENTIFICAR") return { label: decodedItemLabel, strategy: "encodedText", ambiguous };
    const decodedLineLabel = findLabelInLines(makeTextLines(decodedItems), pageHeight);
    if (decodedLineLabel !== "SIN-IDENTIFICAR") return { label: decodedLineLabel, strategy: "encodedText", ambiguous };
    const decodedSequenceLabel = findLabelInItemSequence(decodedItems, pageHeight);
    return { label: decodedSequenceLabel, strategy: decodedSequenceLabel === UNIDENTIFIED_LABEL ? "unidentified" : "encodedText", ambiguous };
  }
  return { label: UNIDENTIFIED_LABEL, strategy: "unidentified", ambiguous };
}

function extractOcrLabel(text) {
  const normalized = normalizeWhitespace(text);
  const afterTruss = normalized.match(/truss\s*[:|\-]?\s*(.{0,100})/i)?.[1] || normalized;
  const label = extractCodeToken(afterTruss);
  if (label !== "SIN-IDENTIFICAR") return label;

  // OCR sometimes confuses 0/O and 1/I in identifiers such as F01.
  const repaired = afterTruss
    .replace(/\b([A-Z])([0O])([0-9I]{1,3})\b/gi, (_, letter, zero, digits) =>
      `${letter}0${digits}`.replace(/I/g, "1").replace(/i/g, "1"),
    );
  return extractCodeToken(repaired);
}

async function detectLabelWithOcr(page, worker) {
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  // The TRUSS table is in the page header. Limiting OCR to this area keeps 324-page jobs usable.
  canvas.height = Math.ceil(viewport.height * 0.24);
  const context = canvas.getContext("2d", { alpha: false });
  try {
    await page.render({ canvasContext: context, viewport }).promise;
    const result = await worker.recognize(canvas);
    return extractOcrLabel(result.data?.text || "");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function cancelledError() {
  const error = new Error(t("cancelledError"));
  error.name = "AbortError";
  return error;
}

function checkCancelled() {
  if (state.cancelRequested) throw cancelledError();
}

async function contentHash(bytes) {
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function byteArraysEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

async function inspectFile(file, fileIndex, totalFiles, ensureOcrWorker = null, options = {}) {
  state.currentFileIndex = fileIndex;
  checkCancelled();
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkCancelled();
  const hash = options.hashContent ? await contentHash(bytes) : null;
  const hashMatches = hash && options.seenHashes?.get(hash);
  if (hashMatches) {
    for (const match of hashMatches) {
      const matchBytes = new Uint8Array(await match.file.arrayBuffer());
      if (byteArraysEqual(bytes, matchBytes)) {
        return { file, hash, duplicateOf: match.name, pages: [] };
      }
    }
  }
  const contentId = hashMatches?.length ? `${hash}-${hashMatches.length + 1}` : hash;
  if (hash && options.seenHashes) {
    if (!options.seenHashes.has(hash)) options.seenHashes.set(hash, []);
    options.seenHashes.get(hash).push({ name: file.name, file, id: contentId });
  }

  const loadingTask = pdfjsLib.getDocument({ data: options.retainBytes === false ? bytes : bytes.slice() });
  let pdfDocument = null;
  const pages = [];

  try {
    pdfDocument = await loadingTask.promise;
    state.diagnosticPagesTotal += pdfDocument.numPages;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      checkCancelled();
      const page = await pdfDocument.getPage(pageNumber);
      let label;
      let detectionStrategy = "unidentified";
      let ambiguous = false;
      let usedOcr = false;
      try {
        const detection = await detectPageLabel(page);
        label = detection.label;
        detectionStrategy = detection.strategy;
        ambiguous = detection.ambiguous;
        if (label === "SIN-IDENTIFICAR" && ensureOcrWorker) {
          const ocrWorker = await ensureOcrWorker();
          checkCancelled();
          label = await detectLabelWithOcr(page, ocrWorker);
          usedOcr = true;
          detectionStrategy = label === UNIDENTIFIED_LABEL ? "unidentified" : "ocr";
        }
      } finally {
        page.cleanup();
      }
      state.diagnosticPagesInspected += 1;
      if (usedOcr) state.diagnosticOcrPages += 1;
      if (label === UNIDENTIFIED_LABEL) state.diagnosticUnidentifiedPages += 1;
      else state.diagnosticIdentifiedPages += 1;
      diagnosticTracker?.recordDetection(detectionStrategy);
      if (ambiguous) {
        diagnosticTracker?.recordDetection("ambiguous");
        diagnosticTracker?.recordDetection("trussAndType");
      }
      pages.push({ pageNumber, label });
      const completed = ((fileIndex + pageNumber / pdfDocument.numPages) / totalFiles) * 70;
      setProgress(
        usedOcr ? "progressOcr" : (options.progressKey || "progressReading"),
        completed,
        "inspectDetail",
        {
          fileIndex: fileIndex + 1,
          totalFiles,
          name: file.name,
          pageNumber,
          totalPages: pdfDocument.numPages,
        },
      );
    }
  } finally {
    if (pdfDocument) {
      await pdfDocument.cleanup().catch(() => {});
      await pdfDocument.destroy().catch(() => {});
    } else {
      await loadingTask.destroy().catch(() => {});
    }
  }

  checkCancelled();
  return {
    id: contentId || fileKey(file),
    file,
    hash,
    bytes: options.retainBytes === false ? null : bytes,
    pages,
  };
}

function canonicalLabel(label) {
  return normalizeWhitespace(label).toUpperCase() || "SIN-IDENTIFICAR";
}

async function buildGroupedPdfs(inspectedFiles) {
  const groups = new Map();
  for (const inspected of inspectedFiles) {
    for (let index = 0; index < inspected.pages.length; index += 1) {
      const page = inspected.pages[index];
      const key = canonicalLabel(page.label);
      if (!groups.has(key)) groups.set(key, { label: key, sources: [] });
      groups.get(key).sources.push({ inspected, pageIndex: index });
    }
  }

  const results = [];
  const loadedDocuments = new Map();
  const orderedGroups = [...groups.values()].sort((left, right) => {
    if (left.label === UNIDENTIFIED_LABEL) return -1;
    if (right.label === UNIDENTIFIED_LABEL) return 1;
    return naturalCollator.compare(left.label, right.label);
  });
  let groupIndex = 0;
  for (const group of orderedGroups) {
    checkCancelled();
    groupIndex += 1;
    setProgress(
      "progressCreating",
      70 + (groupIndex / orderedGroups.length) * 20,
      "creatingDetail",
      {
        index: groupIndex,
        total: orderedGroups.length,
        label: group.label,
        isUnidentified: group.label === UNIDENTIFIED_LABEL,
        pages: group.sources.length,
      },
    );
    const output = await PDFLib.PDFDocument.create();

    for (const source of group.sources) {
      checkCancelled();
      let sourceDocument = loadedDocuments.get(source.inspected.file);
      if (!sourceDocument) {
        sourceDocument = await PDFLib.PDFDocument.load(source.inspected.bytes);
        loadedDocuments.set(source.inspected.file, sourceDocument);
      }
      const [page] = await output.copyPages(sourceDocument, [source.pageIndex]);
      output.addPage(page);
    }

    results.push({
      nameKind: group.label === UNIDENTIFIED_LABEL ? "unidentified" : "code",
      label: group.label,
      pageCount: group.sources.length,
      bytes: await output.save(),
    });
  }
  checkCancelled();
  return results;
}

function selectMergePageIndices(inspectedFiles) {
  const latestFileByLabel = new Map();
  const filesByLabel = new Map();

  inspectedFiles.forEach((inspected, fileIndex) => {
    for (const page of inspected.pages) {
      const label = canonicalLabel(page.label);
      if (label === UNIDENTIFIED_LABEL) continue;
      latestFileByLabel.set(label, fileIndex);
      if (!filesByLabel.has(label)) filesByLabel.set(label, new Set());
      filesByLabel.get(label).add(fileIndex);
    }
  });

  const indices = inspectedFiles.map((inspected, fileIndex) => inspected.pages
    .map((page, pageIndex) => ({ page, pageIndex }))
    .filter(({ page }) => {
      const label = canonicalLabel(page.label);
      return label === UNIDENTIFIED_LABEL || latestFileByLabel.get(label) === fileIndex;
    })
    .map(({ pageIndex }) => pageIndex));

  const totalPages = inspectedFiles.reduce((total, inspected) => total + inspected.pages.length, 0);
  const retainedPages = indices.reduce((total, pageIndices) => total + pageIndices.length, 0);
  const replacedCodeCount = [...filesByLabel.values()].filter((fileIndices) => fileIndices.size > 1).length;

  return {
    indices,
    replacedCodeCount,
    discardedPageCount: totalPages - retainedPages,
    priorityFileName: inspectedFiles.at(-1)?.file.name || "",
  };
}

async function buildMergedPdf(inspectedFiles) {
  setProgress("progressMerging", 75, "mergingDetail");
  const output = await PDFLib.PDFDocument.create();
  const selection = selectMergePageIndices(inspectedFiles);
  let pageCount = 0;

  for (let fileIndex = 0; fileIndex < inspectedFiles.length; fileIndex += 1) {
    checkCancelled();
    const inspected = inspectedFiles[fileIndex];
    const pageIndices = selection.indices[fileIndex];
    if (pageIndices.length === 0) continue;

    setProgress(
      "progressBuildingMerged",
      75 + ((fileIndex + 1) / inspectedFiles.length) * 24,
      "buildingMergedDetail",
      { index: fileIndex + 1, total: inspectedFiles.length, name: inspected.file.name },
    );
    const source = await PDFLib.PDFDocument.load(inspected.bytes);
    const pages = await output.copyPages(source, pageIndices);
    pages.forEach((page) => output.addPage(page));
    pageCount += pages.length;
  }

  checkCancelled();
  const bytes = await output.save();
  return {
    results: [{
      nameKind: "merged",
      label: null,
      pageCount,
      bytes,
    }],
    operationSummary: {
      retainedPages: pageCount,
      replacedCodeCount: selection.replacedCodeCount,
      discardedPageCount: selection.discardedPageCount,
      priorityFileName: selection.priorityFileName,
    },
  };
}

const LARGE_PACKAGE_DIRECT_THRESHOLD = 192 * 1024 * 1024;
const MASTER_ZIP_MEMORY_LIMIT = 256 * 1024 * 1024;
const ESTIMATED_BYTES_PER_PAGE = 512 * 1024;
const PDF_COPY_SIZE_MARGIN = 1.5;
const MASTER_PEAK_MARGIN = 1.25;

function packageStatusKey(status) {
  return {
    satisfactory: "pclStatusSatisfactory",
    partial: "pclStatusPartial",
    no_matches: "pclStatusNoMatches",
    invalid: "pclStatusInvalid",
  }[status] || "pclStatusInvalid";
}

function estimatePackageBytes(result) {
  let total = new Blob([result.reportText]).size + 64 * 1024;
  for (const item of result.plan.available) {
    const sourceBytes = state.pclSources.get(item.sourceId)?.file.size || 0;
    const pageBytes = item.pageNumbers.length * ESTIMATED_BYTES_PER_PAGE;
    total += Math.max(sourceBytes * PDF_COPY_SIZE_MARGIN, pageBytes);
  }
  return total;
}

function estimateMasterBytes(results) {
  const packageEstimates = results.map(estimatePackageBytes);
  const archiveBytes = packageEstimates.reduce((total, bytes) => total + bytes, 0);
  const largestChild = Math.max(0, ...packageEstimates);
  return (archiveBytes + largestChild) * MASTER_PEAK_MARGIN;
}

async function buildPclOutcome({ sources, requests, duplicatePdfs, reportLanguage }) {
  state.pclSources = new Map(sources.map((source) => [source.id, source]));
  const results = [];
  diagnosticTracker?.enterPhase("planning_packages", diagnosticCounts());
  for (let index = 0; index < requests.length; index += 1) {
    checkCancelled();
    const request = requests[index];
    setProgress(
      "progressPlanningPcls",
      70 + ((index + 1) / requests.length) * 22,
      "planningPclDetail",
      { index: index + 1, total: requests.length, name: request.file.name },
    );
    const plan = window.PclDomain.planPackage(request.parsed, sources);
    const reportText = window.PclDomain.buildReport({
      pclName: request.file.name,
      parsed: request.parsed,
      plan,
      language: reportLanguage,
    });
    results.push({
      nameKind: "pcl-package",
      label: request.packageName,
      packageName: request.packageName,
      pclName: request.file.name,
      parsed: request.parsed,
      plan,
      reportLanguage,
      reportText,
    });
  }

  const totalPages = sources.reduce((total, source) => total + source.pages.length, 0);
  const unidentifiedDetails = sources.flatMap((source) => source.pages
    .filter((page) => canonicalLabel(page.label) === UNIDENTIFIED_LABEL)
    .map((page) => ({ sourceName: source.name, pageNumber: page.pageNumber })));
  const unidentifiedPages = unidentifiedDetails.length;
  const available = results.reduce((total, result) => total + result.plan.available.length, 0);
  const missing = results.reduce((total, result) => total + result.plan.missing.length, 0);
  const conflicts = results.reduce((total, result) => total + result.plan.conflicts.length, 0);
  state.pclGlobalSummary = {
    unidentifiedPages,
    unidentifiedDetails,
    duplicatePdfs,
    masterAvailable: estimateMasterBytes(results) <= MASTER_ZIP_MEMORY_LIMIT,
  };
  return {
    results,
    summary: {
      totalPages,
      identifiedPages: totalPages - unidentifiedPages,
      unidentifiedPages,
      resultCount: results.length,
      pclCount: results.length,
      available,
      missing,
      conflicts,
    },
    sources,
    requests,
    duplicatePdfs,
    reportLanguage,
  };
}

async function processPclMode(ensureOcrWorker) {
  if (!window.PclDomain || !window.ZipWriter) throw new Error("PCL tools unavailable");
  diagnosticTracker?.enterPhase("reading_pcl", diagnosticCounts());
  const reportLanguage = state.language;
  const packageNames = window.PclDomain.assignPackageNames(state.pclFiles.map((file) => file.name));
  const requests = [];

  for (let index = 0; index < state.pclFiles.length; index += 1) {
    checkCancelled();
    const file = state.pclFiles[index];
    setProgress(
      "progressReadingPcls",
      ((index + 1) / state.pclFiles.length) * 5,
      "readingPclDetail",
      { index: index + 1, total: state.pclFiles.length, name: file.name },
    );
    const parsed = window.PclDomain.parsePcl(await file.text());
    requests.push({ file, packageName: packageNames[index], parsed });
  }

  const sources = [];
  const duplicatePdfs = [];
  const seenHashes = new Map();
  diagnosticTracker?.enterPhase("indexing", diagnosticCounts());
  for (let index = 0; index < state.files.length; index += 1) {
    checkCancelled();
    const inspected = await inspectFile(
      state.files[index],
      index,
      state.files.length,
      ensureOcrWorker,
      {
        retainBytes: false,
        hashContent: true,
        seenHashes,
        progressKey: "progressIndexingPdfs",
      },
    );
    state.diagnosticProcessedPdfCount += 1;
    if (inspected.duplicateOf) {
      state.diagnosticDuplicatePdfCount += 1;
      duplicatePdfs.push({ name: inspected.file.name, duplicateOf: inspected.duplicateOf });
    } else {
      sources.push({
        id: inspected.id,
        name: inspected.file.name,
        file: inspected.file,
        pages: inspected.pages,
      });
    }
  }

  return buildPclOutcome({ sources, requests, duplicatePdfs, reportLanguage });
}

async function addTrussPdfsToArchive(archive, result) {
  let cachedSourceId = null;
  let cachedDocument = null;
  for (const [index, item] of result.plan.available.entries()) {
    checkCancelled();
    if (cachedSourceId !== item.sourceId) {
      const source = state.pclSources.get(item.sourceId);
      if (!source) throw new Error(`Missing indexed source ${item.sourceId}`);
      cachedDocument = await PDFLib.PDFDocument.load(await source.file.arrayBuffer());
      cachedSourceId = item.sourceId;
    }
    const output = await PDFLib.PDFDocument.create();
    const copiedPages = await output.copyPages(
      cachedDocument,
      item.pageNumbers.map((pageNumber) => pageNumber - 1),
    );
    copiedPages.forEach((page) => output.addPage(page));
    if (output.getPageCount() !== item.pageNumbers.length) {
      throw integrityError("PDF_ARTIFACT_INTEGRITY_FAILED");
    }
    const artifactBytes = await output.save();
    await validatePdfArtifact({ bytes: artifactBytes, pageCount: item.pageNumbers.length });
    await archive.add(`${sanitizeFileName(item.code)}.pdf`, artifactBytes);
    if ((index + 1) % 20 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

async function buildPclArchive(result, sink) {
  const archive = new window.ZipWriter.Archive(sink);
  try {
    await addTrussPdfsToArchive(archive, result);
    await archive.add("reporte.txt", `\uFEFF${result.reportText}\n`);
    if (archive.entries.length !== result.plan.available.length + 1) {
      throw integrityError("ZIP_INTEGRITY_FAILED");
    }
    return await archive.close();
  } catch (error) {
    await archive.abort().catch(() => {});
    throw error;
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function describeMergeReplacements(inspectedFiles) {
  const sourcesByCode = new Map();
  inspectedFiles.forEach((inspected) => {
    const codesInFile = new Set(inspected.pages
      .map((page) => canonicalLabel(page.label))
      .filter((code) => code !== UNIDENTIFIED_LABEL));
    for (const code of codesInFile) {
      if (!sourcesByCode.has(code)) sourcesByCode.set(code, []);
      sourcesByCode.get(code).push(inspected.file.name);
    }
  });
  return [...sourcesByCode.entries()].flatMap(([code, names]) => names.length > 1 ? [{
    code,
    winner: names.at(-1),
    discarded: names.slice(0, -1),
  }] : []);
}

function finishTrackedDownload() {
  if (!diagnosticTracker?.getCurrent()) return;
  const artifactCount = (diagnosticTracker.getCurrent().counts.artifactCount || 0) + 1;
  diagnosticTracker.finishDownload({ artifactCount });
  renderDiagnostics();
}

async function failTrackedDownload(errorCode) {
  if (!diagnosticTracker?.getCurrent()) return;
  const incident = diagnosticTracker.failDownload(errorCode);
  renderDiagnostics();
  await incident;
  renderDiagnostics();
}

async function packageSink(result, onReady) {
  const estimate = estimatePackageBytes(result);
  if (
    estimate > LARGE_PACKAGE_DIRECT_THRESHOLD
    && window.isSecureContext
    && typeof window.showSaveFilePicker === "function"
  ) {
    const handle = await window.showSaveFilePicker({
      suggestedName: `${result.packageName}.zip`,
      types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
    });
    onReady();
    return { sink: await window.ZipWriter.createFileSink(handle), direct: true };
  }
  onReady();
  return { sink: window.ZipWriter.createBlobSink(), direct: false };
}

async function downloadPclPackage(result) {
  if (isLocked()) return;
  state.creatingPackageName = result.packageName;
  updateControls();
  renderResults();
  let downloadStarted = false;
  const beginDownload = () => {
    diagnosticTracker?.startDownload("individual_zip");
    downloadStarted = true;
    renderDiagnostics();
  };
  try {
    const { sink, direct } = await packageSink(result, beginDownload);
    const blob = await buildPclArchive(result, sink);
    if (!direct && blob) downloadBlob(blob, `${result.packageName}.zip`);
    finishTrackedDownload();
    setToast("packageCreated", { name: result.packageName });
  } catch (error) {
    const cancelledBeforeStart = error?.name === "AbortError" && !downloadStarted;
    if (!cancelledBeforeStart) {
      console.error(error);
      if (!downloadStarted) {
        beginDownload();
      }
      if (downloadStarted) await failTrackedDownload(error.diagnosticCode || "ZIP_INDIVIDUAL_FAILED");
      setToast("errorPackageCreate", {}, true);
    }
  } finally {
    state.creatingPackageName = null;
    updateControls();
    renderResults();
  }
}

async function buildTrePclOutcome() {
  if (!window.PclDomain || !window.TrePclDomain || !window.ZipWriter) {
    const error = new Error("TRE/PCL tools unavailable");
    error.diagnosticCode = "TRE_PCL_TOOLS_UNAVAILABLE";
    throw error;
  }
  const packageNames = window.PclDomain.assignPackageNames(state.pclFiles.map((file) => file.name));
  const requests = [];
  diagnosticTracker?.enterPhase("reading_pcl", diagnosticCounts());
  for (let index = 0; index < state.pclFiles.length; index += 1) {
    checkCancelled();
    const file = state.pclFiles[index];
    setProgress("progressReadingPcls", ((index + 1) / state.pclFiles.length) * 35, "readingPclDetail", {
      index: index + 1,
      total: state.pclFiles.length,
      name: file.name,
    });
    requests.push({ file, parsed: window.PclDomain.parsePcl(await file.text()) });
  }
  checkCancelled();
  diagnosticTracker?.enterPhase("planning_packages", diagnosticCounts());
  state.results = window.TrePclDomain.planPackages(requests, state.treFiles, packageNames);
  state.results.forEach((result, index) => {
    checkCancelled();
    setProgress("progressPlanningTrePcls", 35 + ((index + 1) / state.results.length) * 55);
    result.reportText = window.TrePclDomain.buildReport(result, state.language);
  });
  const available = state.results.reduce((total, result) => total + result.available.length, 0);
  const missing = state.results.reduce((total, result) => total + result.missing.length, 0);
  const conflicts = state.results.reduce((total, result) => total + result.conflicts.length, 0);
  const estimatedOutputBytes = state.results.reduce((total, result) => total
    + result.available.reduce((fileTotal, item) => fileTotal + item.file.size, 0)
    + result.available.length * 512
    + result.reportText.length * 2, 0);
  const canSaveDirect = window.isSecureContext && typeof window.showSaveFilePicker === "function";
  state.summary = {
    totalPages: 0,
    identifiedPages: 0,
    unidentifiedPages: 0,
    pclCount: state.results.length,
    treCount: state.treFiles.length,
    available,
    missing,
    conflicts,
    resultCount: state.results.length,
    masterAvailable: estimatedOutputBytes <= MASTER_ZIP_MEMORY_LIMIT || canSaveDirect,
  };
}

async function buildTrePclMaster(sink) {
  const archive = new window.ZipWriter.Archive(sink);
  try {
    for (const result of state.results) {
      checkCancelled();
      for (const item of result.available) {
        await archive.add(`${result.packageName}/${item.code}.tre`, item.file);
      }
      await archive.add(`${result.packageName}/reporte.txt`, `\uFEFF${result.reportText}\n`);
    }
    const expectedEntries = state.results.reduce((total, result) => total + result.available.length + 1, 0);
    if (archive.entries.length !== expectedEntries) throw integrityError("TRE_PCL_ZIP_INTEGRITY_FAILED");
    return await archive.close();
  } catch (error) {
    await archive.abort().catch(() => {});
    throw error;
  }
}

async function downloadTrePclMaster() {
  if (isLocked() || !state.results.length) return;
  if (!state.summary?.masterAvailable) {
    setToast("trePclMasterUnavailable", {}, true);
    return;
  }
  state.creatingZip = true;
  updateControls();
  renderResults();
  let downloadStarted = false;
  let direct = false;
  try {
    const estimatedBytes = state.treFiles.reduce((total, file) => total + file.size, 0)
      + state.results.reduce((total, result) => total + result.available.length * 512, 0);
    let sink = window.ZipWriter.createBlobSink();
    if (estimatedBytes > LARGE_PACKAGE_DIRECT_THRESHOLD && window.isSecureContext
      && typeof window.showSaveFilePicker === "function") {
      const handle = await window.showSaveFilePicker({
        suggestedName: "paquetes-tre-pcl.zip",
        types: [{ description: "ZIP", accept: { "application/zip": [".zip"] } }],
      });
      sink = await window.ZipWriter.createFileSink(handle);
      direct = true;
    }
    diagnosticTracker?.startDownload("master_zip");
    downloadStarted = true;
    renderDiagnostics();
    const blob = await buildTrePclMaster(sink);
    if (!direct && blob) downloadBlob(blob, "paquetes-tre-pcl.zip");
    finishTrackedDownload();
    setToast("trePclZipCreated", { count: state.results.length });
  } catch (error) {
    if (error?.name === "AbortError" && !downloadStarted) return;
    console.error(error);
    if (!downloadStarted) {
      diagnosticTracker?.startDownload("master_zip");
      downloadStarted = true;
    }
    await failTrackedDownload(error.diagnosticCode || "TRE_PCL_ZIP_FAILED");
    setToast("errorTrePclZip", {}, true);
  } finally {
    state.creatingZip = false;
    updateControls();
    renderResults();
  }
}

function buildGeneralReport(results, language) {
  const spanish = language !== "en";
  const lines = [
    spanish ? "REPORTE GENERAL DE PAQUETES PCL" : "PCL PACKAGE GENERAL REPORT",
    "",
    `${spanish ? "Paquetes" : "Packages"}: ${results.length}`,
    `${spanish ? "Páginas sin identificar" : "Unidentified pages"}: ${state.pclGlobalSummary?.unidentifiedPages || 0}`,
    `${spanish ? "PDFs idénticos omitidos" : "Identical PDFs omitted"}: ${state.pclGlobalSummary?.duplicatePdfs.length || 0}`,
    "",
  ];
  for (const result of results) {
    lines.push(
      `${result.packageName}.zip — ${translate(language, packageStatusKey(result.plan.status))} — ${result.plan.available.length} ${spanish ? "disponibles" : "available"}, ${result.plan.missing.length} ${spanish ? "faltantes" : "missing"}, ${result.plan.conflicts.length} ${spanish ? "conflictos" : "conflicts"}`,
    );
  }
  if (state.pclGlobalSummary?.duplicatePdfs.length) {
    lines.push("", spanish ? "PDFs idénticos omitidos" : "Identical PDFs omitted");
    for (const item of state.pclGlobalSummary.duplicatePdfs) {
      lines.push(`${item.name} — ${spanish ? "copia de" : "copy of"} ${item.duplicateOf}`);
    }
  }
  if (state.pclGlobalSummary?.unidentifiedDetails.length) {
    lines.push("", spanish ? "Páginas sin identificar" : "Unidentified pages");
    for (const item of state.pclGlobalSummary.unidentifiedDetails) {
      lines.push(`${item.sourceName} — ${spanish ? "página" : "page"} ${item.pageNumber}`);
    }
  }
  return lines.join("\n");
}

async function downloadPclMaster() {
  if (isLocked() || !state.results.length) return;
  if (!state.pclGlobalSummary?.masterAvailable) {
    setToast("masterUnavailable", {}, true);
    return;
  }
  state.creatingZip = true;
  updateControls();
  renderResults();
  let master = null;
  try {
    diagnosticTracker?.startDownload("master_zip");
    renderDiagnostics();
    master = new window.ZipWriter.Archive(window.ZipWriter.createBlobSink());
    for (const result of state.results) {
      const childBlob = await buildPclArchive(result, window.ZipWriter.createBlobSink());
      await master.add(`${result.packageName}.zip`, childBlob);
    }
    const language = state.results[0]?.reportLanguage || state.language;
    await master.add("reporte-general.txt", `\uFEFF${buildGeneralReport(state.results, language)}\n`);
    if (master.entries.length !== state.results.length + 1) {
      throw integrityError("ZIP_MASTER_INTEGRITY_FAILED");
    }
    downloadBlob(await master.close(), "paquetes-pcl.zip");
    finishTrackedDownload();
    setToast("masterCreated", { count: state.results.length });
  } catch (error) {
    if (master) await master.abort().catch(() => {});
    console.error(error);
    await failTrackedDownload(error.diagnosticCode || "ZIP_MASTER_FAILED");
    setToast("errorZipCreate", {}, true);
  } finally {
    state.creatingZip = false;
    updateControls();
    renderResults();
  }
}

function sanitizeFileName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sin-identificar";
}

function friendlyPdfError(error) {
  const diagnosticMessageKey = {
    OCR_UNAVAILABLE: "errorOcrUnavailable",
    OCR_INIT_TIMEOUT: "errorOcrTimeout",
    OCR_INIT_FAILED: "errorOcrInitFailed",
  }[error?.diagnosticCode];
  if (diagnosticMessageKey) return diagnosticMessageKey;
  const rawMessage = String(error?.message || "").toLowerCase();
  const errorName = String(error?.name || "").toLowerCase();
  if (rawMessage.includes("password") || errorName.includes("password")) {
    return "errorPassword";
  }
  if (rawMessage.includes("invalid pdf") || rawMessage.includes("pdf structure") || errorName.includes("invalidpdf")) {
    return "errorInvalidPdf";
  }
  if (rawMessage.includes("missing pdf") || rawMessage.includes("empty")) {
    return "errorEmptyPdf";
  }
  if (rawMessage.includes("ocr") || rawMessage.includes("worker") || rawMessage.includes("network")) {
    return "errorOcr";
  }
  return "errorGenericPdf";
}

function diagnosticErrorCode(friendlyMessageKey, error) {
  if (/^[A-Z][A-Z0-9_]{0,63}$/.test(String(error?.diagnosticCode || ""))) {
    return error.diagnosticCode;
  }
  return {
    errorPdfTools: "PDF_TOOLS_UNAVAILABLE",
    errorPclTools: "PCL_TOOLS_UNAVAILABLE",
    errorTrePclTools: "TRE_PCL_TOOLS_UNAVAILABLE",
    errorTrePclRead: "TRE_PCL_READ_FAILED",
    errorPassword: "PDF_PASSWORD_PROTECTED",
    errorInvalidPdf: "PDF_INVALID",
    errorEmptyPdf: "PDF_EMPTY",
    errorOcr: "OCR_FAILED",
    errorOcrLoad: "OCR_UNAVAILABLE",
    errorOcrUnavailable: "OCR_UNAVAILABLE",
    errorOcrTimeout: "OCR_INIT_TIMEOUT",
    errorOcrInitFailed: "OCR_INIT_FAILED",
    errorPclRead: "PCL_INVALID",
  }[friendlyMessageKey] || "PDF_PROCESSING_FAILED";
}

function diagnosticCounts() {
  const summary = state.summary || {};
  const counts = {
    pagesTotal: state.diagnosticPagesTotal,
    pagesInspected: state.diagnosticPagesInspected,
    ocrPages: state.diagnosticOcrPages,
    identifiedPages: Number.isSafeInteger(summary.identifiedPages)
      ? summary.identifiedPages
      : state.diagnosticIdentifiedPages,
    unidentifiedPages: Number.isSafeInteger(summary.unidentifiedPages)
      ? summary.unidentifiedPages
      : state.diagnosticUnidentifiedPages,
    duplicatePdfCount: state.diagnosticDuplicatePdfCount,
    resultCount: state.results.length,
    manualAssignmentCount: state.manualAssignmentCount,
    keptUnidentifiedCount: state.keptUnidentifiedCount,
  };
  if (state.mode === "pcl") {
    counts.availableCount = summary.available || 0;
    counts.missingCount = summary.missing || 0;
    counts.conflictCount = summary.conflicts || 0;
  }
  if (state.mode === "tre-pcl") {
    counts.treCount = state.treFiles.length;
    counts.availableCount = summary.available || 0;
    counts.missingCount = summary.missing || 0;
    counts.conflictCount = summary.conflicts || 0;
  }
  if (state.mode === "merge") {
    counts.retainedPages = state.operationSummary?.retainedPages || 0;
    counts.discardedPages = state.operationSummary?.discardedPageCount || 0;
  }
  return counts;
}

function integrityError(code) {
  const error = new Error("Generated output did not pass its integrity checks.");
  error.diagnosticCode = code;
  return error;
}

async function validatePdfArtifact(result) {
  if (!result?.bytes?.byteLength || !Number.isSafeInteger(result.pageCount) || result.pageCount < 1) {
    throw integrityError("PDF_ARTIFACT_INTEGRITY_FAILED");
  }
  try {
    const document = await PDFLib.PDFDocument.load(result.bytes);
    if (document.getPageCount() !== result.pageCount) {
      throw integrityError("PDF_ARTIFACT_INTEGRITY_FAILED");
    }
  } catch (error) {
    if (error?.diagnosticCode) throw error;
    throw integrityError("PDF_ARTIFACT_INTEGRITY_FAILED");
  }
}

async function validateResultsIntegrity(mode) {
  const summary = state.summary;
  if (!summary) throw integrityError("RESULT_INTEGRITY_FAILED");
  if (state.diagnosticPagesTotal !== state.diagnosticPagesInspected) {
    throw integrityError("PAGE_ACCOUNTING_FAILED");
  }
  if (summary.totalPages !== summary.identifiedPages + summary.unidentifiedPages) {
    throw integrityError("PAGE_ACCOUNTING_FAILED");
  }
  if (summary.totalPages !== state.diagnosticPagesInspected) {
    throw integrityError("PAGE_ACCOUNTING_FAILED");
  }
  if (mode !== "tre-pcl" && state.files.length !== state.diagnosticProcessedPdfCount) {
    throw integrityError("SOURCE_ACCOUNTING_FAILED");
  }

  if (mode === "split") {
    const outputPages = state.results.reduce((total, result) => total + result.pageCount, 0);
    if (outputPages !== summary.totalPages) throw integrityError("SPLIT_INTEGRITY_FAILED");
    for (const result of state.results) await validatePdfArtifact(result);
    return;
  }

  if (mode === "merge") {
    const merged = state.results[0];
    const retained = state.operationSummary?.retainedPages;
    const discarded = state.operationSummary?.discardedPageCount;
    if (state.results.length !== 1 || merged?.pageCount !== retained || retained + discarded !== summary.totalPages) {
      throw integrityError("MERGE_INTEGRITY_FAILED");
    }
    await validatePdfArtifact(merged);
    return;
  }

  if (mode === "tre-pcl") {
    if (state.results.length !== state.pclFiles.length || summary.pclCount !== state.pclFiles.length) {
      throw integrityError("TRE_PCL_INTEGRITY_FAILED");
    }
    for (const result of state.results) {
      const requested = result.parsed.codes || [];
      const partition = [...result.available.map((item) => item.code), ...result.missing, ...result.conflicts.map((item) => item.code)];
      if (partition.length !== requested.length || new Set(partition).size !== requested.length
        || requested.some((code) => !partition.includes(code))) {
        throw integrityError("TRE_PCL_INTEGRITY_FAILED");
      }
      for (const item of result.available) {
        if (!state.treFiles.includes(item.file) || window.TrePclDomain.canonicalName(item.file.name) !== item.code) {
          throw integrityError("TRE_PCL_SOURCE_INTEGRITY_FAILED");
        }
      }
    }
    return;
  }

  if (state.results.length !== state.pclFiles.length || summary.pclCount !== state.pclFiles.length) {
    throw integrityError("PCL_INTEGRITY_FAILED");
  }
  for (const result of state.results) {
    const requestedCodes = result.parsed.codes || [];
    const partitionCodes = [
      ...result.plan.available.map((item) => item.code),
      ...result.plan.missing,
      ...result.plan.conflicts.map((item) => item.code),
    ];
    if (
      partitionCodes.length !== requestedCodes.length
      || new Set(partitionCodes).size !== requestedCodes.length
      || requestedCodes.some((code) => !partitionCodes.includes(code))
    ) {
      throw integrityError("PCL_INTEGRITY_FAILED");
    }
    for (const item of result.plan.available) {
      const source = state.pclSources.get(item.sourceId);
      const validPages = item.pageNumbers.length > 0 && item.pageNumbers.every((pageNumber) => {
        const sourcePage = source?.pages.find((page) => page.pageNumber === pageNumber);
        return sourcePage && canonicalLabel(sourcePage.label) === canonicalLabel(item.code);
      });
      if (!source || !validPages) throw integrityError("PCL_SOURCE_INTEGRITY_FAILED");
    }
  }
}

async function downloadResult(result) {
  if (result.nameKind === "pcl-package") {
    await downloadPclPackage(result);
    return;
  }
  diagnosticTracker?.startDownload("pdf");
  renderDiagnostics();
  try {
    await validatePdfArtifact(result);
    downloadBlob(new Blob([result.bytes], { type: "application/pdf" }), resultFileName(result));
    finishTrackedDownload();
  } catch (error) {
    console.error(error);
    await failTrackedDownload(error.diagnosticCode || "PDF_DOWNLOAD_FAILED");
    setToast("errorGenericPdf", {}, true);
  }
}

async function downloadResultsAsZip() {
  if (state.mode === "tre-pcl") {
    await downloadTrePclMaster();
    return;
  }
  if (state.mode === "pcl") {
    await downloadPclMaster();
    return;
  }
  if (isLocked() || state.results.length < 2) return;
  if (!window.JSZip) {
    diagnosticTracker?.startDownload("master_zip");
    renderDiagnostics();
    await failTrackedDownload("ZIP_TOOL_UNAVAILABLE");
    setToast("errorZipTool", {}, true);
    return;
  }

  elements.downloadAll.disabled = true;
  state.creatingZip = true;
  elements.downloadAll.textContent = t("creatingZip");
  try {
    diagnosticTracker?.startDownload("master_zip");
    renderDiagnostics();
    const zip = new JSZip();
    for (const result of state.results) {
      zip.file(resultFileName(result), result.bytes);
    }
    if (Object.keys(zip.files).length !== state.results.length) {
      throw integrityError("ZIP_INTEGRITY_FAILED");
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = t("zipFile");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    finishTrackedDownload();
    setToast("zipCreated", { count: state.results.length });
  } catch (error) {
    console.error(error);
    await failTrackedDownload(error.diagnosticCode || "ZIP_MASTER_FAILED");
    setToast("errorZipCreate", {}, true);
  } finally {
    state.creatingZip = false;
    elements.downloadAll.disabled = false;
    elements.downloadAll.textContent = t("downloadZip");
  }
}

function filteredResults() {
  const query = state.resultQuery.trim().toLocaleUpperCase(state.language);
  return state.results.filter((result) => {
    const needsReview = state.mode === "pcl"
      ? result.plan.status !== "satisfactory"
      : state.mode === "tre-pcl"
        ? result.status !== "satisfactory"
        : result.label === UNIDENTIFIED_LABEL;
    const matchesFilter = state.resultFilter !== "review" || needsReview;
    const matchesQuery = !query
      || resultDisplayLabel(result).toLocaleUpperCase(state.language).includes(query)
      || resultFileName(result).toLocaleUpperCase(state.language).includes(query);
    return matchesFilter && matchesQuery;
  });
}

function resultFileName(result) {
  if (result.nameKind === "pcl-package") return `${result.packageName}.zip`;
  if (result.nameKind === "tre-pcl-folder") return result.packageName;
  if (result.nameKind === "unidentified") return t("unidentifiedFile");
  if (result.nameKind === "merged") return t("mergedFile");
  return `${sanitizeFileName(result.label)}-S.pdf`;
}

function resultDisplayLabel(result) {
  if (result.nameKind === "pcl-package") return result.packageName;
  if (result.nameKind === "tre-pcl-folder") return result.packageName;
  if (result.nameKind === "unidentified") return t("unidentifiedDisplay");
  if (result.nameKind === "merged") return t("mergedResultLabel");
  return result.label;
}

function renderSummary() {
  elements.resultsSummary.replaceChildren();
  if (!state.summary) return;
  const summaryItems = state.mode === "pcl"
    ? [
      ["summaryPcls", state.summary.pclCount],
      ["summaryAvailable", state.summary.available],
      ["summaryMissing", state.summary.missing],
      ["summaryConflicts", state.summary.conflicts],
    ]
    : state.mode === "tre-pcl"
      ? [
        ["summaryPcls", state.summary.pclCount],
        ["summaryTres", state.summary.treCount],
        ["summaryAvailable", state.summary.available],
        ["summaryMissing", state.summary.missing],
        ["summaryConflicts", state.summary.conflicts],
      ]
      : [
      ["summaryReviewed", state.summary.totalPages],
      ["summaryIdentified", state.summary.identifiedPages],
      ["summaryUnidentified", state.summary.unidentifiedPages],
      ["summaryCreated", state.summary.resultCount],
    ];
  for (const [labelKey, value] of summaryItems) {
    const item = document.createElement("div");
    const warning = ["summaryUnidentified", "summaryMissing", "summaryConflicts"].includes(labelKey) && value > 0;
    item.className = `summary-item${warning ? " is-warning" : ""}`;
    item.innerHTML = `<dt>${t(labelKey)}</dt><dd>${value}</dd>`;
    elements.resultsSummary.append(item);
  }
}

function renderOperationSummary() {
  const details = state.operationSummary;
  const pclDetails = state.pclGlobalSummary;
  elements.operationSummary.hidden = !(
    (state.mode === "merge" && details)
    || (state.mode === "pcl" && pclDetails)
    || (state.mode === "tre-pcl" && state.summary)
  );
  if (state.mode === "tre-pcl" && state.summary) {
    elements.operationSummary.innerHTML = t("trePclGlobalSummary", { count: state.summary.pclCount });
    if (!state.summary.masterAvailable) {
      elements.operationSummary.append(document.createElement("br"), document.createTextNode(t("trePclMasterUnavailable")));
    }
    return;
  }
  if (state.mode === "pcl" && pclDetails) {
    elements.operationSummary.innerHTML = t("pclGlobalSummary", {
      unidentified: pclDetails.unidentifiedPages,
      duplicates: pclDetails.duplicatePdfs.length,
    });
    if (!pclDetails.masterAvailable) {
      elements.operationSummary.append(document.createElement("br"), document.createTextNode(t("masterUnavailable")));
    }
  } else if (state.mode === "merge" && details) {
    elements.operationSummary.innerHTML = t("operationSummary", {
      retained: details.retainedPages,
      repeated: details.replacedCodeCount,
      discarded: details.discardedPageCount,
      priority: escapeHtml(details.priorityFileName),
    });
  }
}

function renderResultRow(result) {
  if (result.nameKind === "tre-pcl-folder") {
    const requiresReview = result.status !== "satisfactory";
    const item = document.createElement("li");
    item.className = `result-item${requiresReview ? " is-warning" : ""}${result.status === "invalid" ? " is-invalid" : ""}`;
    item.innerHTML = `
      <span class="result-icon" aria-hidden="true">TRE</span>
      <div class="result-info">
        <div class="result-name" title="${escapeAttribute(result.packageName)}">${escapeHtml(result.packageName)}/</div>
        <div class="result-meta">${t("trePclResultMeta", { available: result.available.length, missing: result.missing.length, conflicts: result.conflicts.length })}</div>
        <span class="result-status is-${result.status.replace("_", "-")}">${t(packageStatusKey(result.status))}</span>
        <details class="pcl-report-details"><summary>${t("viewTrePclReport")}</summary><pre>${escapeHtml(result.reportText)}</pre></details>
      </div>
    `;
    return item;
  }
  if (result.nameKind === "pcl-package") {
    const requiresReview = result.plan.status !== "satisfactory";
    const invalid = result.plan.status === "invalid";
    const name = resultFileName(result);
    const creating = state.creatingPackageName === result.packageName;
    const item = document.createElement("li");
    item.className = `result-item${requiresReview ? " is-warning" : ""}${invalid ? " is-invalid" : ""}`;
    item.innerHTML = `
      <span class="result-icon" aria-hidden="true">PCL</span>
      <div class="result-info">
        <div class="result-name" title="${escapeAttribute(name)}">${escapeHtml(name)}</div>
        <div class="result-meta">${t("pclResultMeta", {
          available: result.plan.available.length,
          missing: result.plan.missing.length,
          conflicts: result.plan.conflicts.length,
        })}</div>
        <span class="result-status is-${result.plan.status.replace("_", "-")}">${t(packageStatusKey(result.plan.status))}</span>
        <details class="pcl-report-details">
          <summary>${t("viewPclReport")}</summary>
          <pre>${escapeHtml(result.reportText)}</pre>
        </details>
      </div>
      <button class="download-button" type="button" aria-label="${escapeAttribute(t("downloadPackageLabel", { name }))}" ${isLocked() ? "disabled" : ""}>${creating ? t("creatingPackage") : t("downloadPackage")}</button>
    `;
    item.querySelector(".download-button").addEventListener("click", () => downloadPclPackage(result));
    return item;
  }
  const requiresReview = result.label === UNIDENTIFIED_LABEL;
  const name = resultFileName(result);
  const label = resultDisplayLabel(result);
  const item = document.createElement("li");
  item.className = `result-item${requiresReview ? " is-warning" : ""}`;
  item.innerHTML = `
    <span class="result-icon" aria-hidden="true">${requiresReview ? t("reviewIcon") : "PDF"}</span>
    <div class="result-info">
      <div class="result-name" title="${escapeAttribute(name)}">${escapeHtml(name)}</div>
      <div class="result-meta">${requiresReview
        ? t("resultReviewMeta", { count: result.pageCount })
        : t("resultMeta", { count: result.pageCount, label: escapeHtml(label) })}</div>
    </div>
    <button class="download-button" type="button" aria-label="${escapeAttribute(t("downloadLabel", { name }))}">${t("download")}</button>
  `;
  item.querySelector(".download-button").addEventListener("click", () => downloadResult(result));
  return item;
}

function currentReviewDecisions() {
  return [...elements.reviewList.querySelectorAll(".review-item")].flatMap((item) => {
    const selected = item.querySelector(".review-action:checked");
    if (!selected) return [];
    return [{
      sourceId: item.dataset.sourceId,
      pageNumber: Number(item.dataset.pageNumber),
      action: selected.value,
      code: item.querySelector(".review-code-input")?.value || "",
    }];
  });
}

function renderReview() {
  const session = state.reviewSession;
  elements.reviewCard.hidden = !session;
  if (!session) return;

  const renderedPreviews = new Map([...elements.reviewList.querySelectorAll(".review-item")].flatMap((item) => {
    const canvas = item.querySelector(".review-preview");
    return canvas?.dataset.ready === "true"
      ? [[`${item.dataset.sourceId}:${item.dataset.pageNumber}`, canvas]]
      : [];
  }));
  const savedDecisions = new Map(currentReviewDecisions().map((decision) => [
    `${decision.sourceId}:${decision.pageNumber}`,
    decision,
  ]));
  const decisionCount = session.unidentified.length + session.replacements.length;
  elements.reviewCount.textContent = t("reviewCount", { count: decisionCount });
  elements.keepAllUnidentified.hidden = session.unidentified.length === 0;
  elements.reviewValidation.hidden = true;
  elements.reviewSuggestions.replaceChildren();
  for (const code of state.reviewContext?.suggestions || []) {
    const option = document.createElement("option");
    option.value = code;
    elements.reviewSuggestions.append(option);
  }

  elements.reviewReplacements.replaceChildren();
  elements.reviewReplacements.hidden = session.replacements.length === 0;
  if (session.replacements.length > 0) {
    const heading = document.createElement("strong");
    heading.textContent = t("reviewReplacementsTitle");
    const list = document.createElement("ul");
    for (const replacement of session.replacements) {
      const item = document.createElement("li");
      item.textContent = t("reviewReplacement", {
        code: replacement.code,
        winner: replacement.winner,
        discarded: replacement.discarded.join(", "),
      });
      list.append(item);
    }
    elements.reviewReplacements.append(heading, list);
  }

  elements.reviewList.replaceChildren();
  session.unidentified.forEach((pending, index) => {
    const item = document.createElement("li");
    item.className = "review-item";
    item.dataset.sourceId = pending.sourceId;
    item.dataset.pageNumber = String(pending.pageNumber);

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "review-preview-button";
    previewButton.disabled = !state.reviewPreviewReady;
    previewButton.setAttribute("aria-expanded", "false");
    previewButton.setAttribute("aria-label", t("reviewPreviewAlt", {
      source: pending.sourceName,
      page: pending.pageNumber,
    }));
    const canvas = document.createElement("canvas");
    canvas.className = "review-preview";
    canvas.dataset.previewIndex = String(index);
    const renderedPreview = renderedPreviews.get(`${pending.sourceId}:${pending.pageNumber}`);
    if (renderedPreview) {
      canvas.width = renderedPreview.width;
      canvas.height = renderedPreview.height;
      canvas.getContext("2d").drawImage(renderedPreview, 0, 0);
      canvas.dataset.ready = "true";
    }
    previewButton.append(canvas);
    previewButton.addEventListener("click", async () => {
      const zoomed = previewButton.classList.toggle("is-zoomed");
      previewButton.setAttribute("aria-expanded", String(zoomed));
      if (!zoomed || canvas.width > 500) return;
      state.reviewPreviewPending += 1;
      previewButton.disabled = true;
      updateControls();
      try {
        const rendered = await renderExpandedReviewPreview(session, pending);
        if (state.reviewSession !== session || state.status !== "review") return;
        const latestItem = [...elements.reviewList.querySelectorAll(".review-item")].find((candidate) => (
          candidate.dataset.sourceId === String(pending.sourceId)
          && Number(candidate.dataset.pageNumber) === pending.pageNumber
        ));
        const latestCanvas = latestItem?.querySelector(".review-preview");
        if (!latestCanvas) throw integrityError("REVIEW_PREVIEW_FAILED");
        copyRenderedCanvas(rendered, latestCanvas);
      } catch (error) {
        if (state.reviewSession === session && state.status === "review") {
          await blockReviewForPreviewFailure(error);
        }
      } finally {
        if (state.reviewSession === session) {
          state.reviewPreviewPending = Math.max(0, state.reviewPreviewPending - 1);
          updateControls();
        }
      }
    });

    const info = document.createElement("div");
    info.className = "review-item-info";
    const source = document.createElement("p");
    source.className = "review-source";
    source.textContent = pending.sourceName;
    const pageMeta = document.createElement("p");
    pageMeta.className = "review-page";
    pageMeta.textContent = t("reviewSourceMeta", { source: pending.sourceName, page: pending.pageNumber });

    const assignLabel = document.createElement("label");
    assignLabel.className = "review-choice";
    const assign = document.createElement("input");
    assign.type = "radio";
    assign.className = "review-action";
    assign.name = `review-${index}`;
    assign.value = "assign";
    const assignText = document.createElement("span");
    assignText.textContent = t("assignCode");
    assignLabel.append(assign, assignText);

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.className = "review-code-input";
    codeInput.setAttribute("list", "review-code-suggestions");
    codeInput.setAttribute("aria-label", t("codeLabel"));
    codeInput.placeholder = t("codePlaceholder");
    codeInput.autocomplete = "off";
    codeInput.addEventListener("input", () => {
      assign.checked = true;
      elements.reviewValidation.hidden = true;
    });
    codeInput.addEventListener("blur", () => {
      codeInput.value = codeInput.value.trim().toUpperCase();
    });

    const keepLabel = document.createElement("label");
    keepLabel.className = "review-choice";
    const keep = document.createElement("input");
    keep.type = "radio";
    keep.className = "review-action";
    keep.name = `review-${index}`;
    keep.value = "keep";
    const keepText = document.createElement("span");
    keepText.textContent = t("keepUnidentified");
    keepLabel.append(keep, keepText);

    const saved = savedDecisions.get(`${pending.sourceId}:${pending.pageNumber}`);
    if (saved?.action === "assign") {
      assign.checked = true;
      codeInput.value = saved.code;
    } else if (saved?.action === "keep") {
      keep.checked = true;
    }
    info.append(source, pageMeta, assignLabel, codeInput, keepLabel);
    item.append(previewButton, info);
    elements.reviewList.append(item);
  });
  updateControls();
}

function copyRenderedCanvas(rendered, canvas) {
  canvas.width = rendered.width;
  canvas.height = rendered.height;
  canvas.getContext("2d").drawImage(rendered, 0, 0);
  canvas.dataset.ready = "true";
}

async function renderExpandedReviewPreview(session, pending) {
  const source = session.sources.find((candidate) => candidate.id === pending.sourceId);
  if (!source?.file && !source?.bytes) throw integrityError("REVIEW_PREVIEW_FAILED");
  const rawBytes = source.bytes || await source.file.arrayBuffer();
  const bytes = rawBytes instanceof Uint8Array ? rawBytes.slice() : new Uint8Array(rawBytes);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  let documentHandle;
  try {
    documentHandle = await loadingTask.promise;
    const page = await documentHandle.getPage(pending.pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.5, 1200 / baseViewport.width) });
    const rendered = document.createElement("canvas");
    rendered.width = Math.max(1, Math.ceil(viewport.width));
    rendered.height = Math.max(1, Math.ceil(viewport.height));
    await page.render({ canvasContext: rendered.getContext("2d"), viewport }).promise;
    page.cleanup();
    return rendered;
  } finally {
    if (documentHandle) {
      await documentHandle.cleanup().catch(() => {});
      await documentHandle.destroy().catch(() => {});
    } else {
      await loadingTask.destroy().catch(() => {});
    }
  }
}

async function blockReviewForPreviewFailure(error) {
  error.diagnosticCode = "REVIEW_PREVIEW_FAILED";
  state.status = "error";
  state.reviewPreviewReady = false;
  state.reviewPreviewPending = 0;
  state.results = [];
  setProgressError("errorReviewPreview");
  updateControls();
  renderResults();
  if (diagnosticTracker?.getCurrent()?.outcome === "processing") {
    const incident = diagnosticTracker.recordIncident(error.diagnosticCode, diagnosticCounts());
    renderDiagnostics();
    await incident;
    renderDiagnostics();
  }
}

async function renderReviewPreviews(session) {
  const pendingBySource = new Map();
  const renderedByIndex = new Map();
  session.unidentified.forEach((pending, index) => {
    if (!pendingBySource.has(pending.sourceId)) pendingBySource.set(pending.sourceId, []);
    pendingBySource.get(pending.sourceId).push({ index, pending });
  });

  for (const [sourceId, pendingPages] of pendingBySource) {
    const source = session.sources.find((candidate) => candidate.id === sourceId);
    if (!source?.file && !source?.bytes) throw integrityError("REVIEW_PREVIEW_FAILED");
    const rawBytes = source.bytes || await source.file.arrayBuffer();
    const bytes = rawBytes instanceof Uint8Array ? rawBytes.slice() : new Uint8Array(rawBytes);
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    let documentHandle;
    try {
      documentHandle = await loadingTask.promise;
      for (const { index, pending } of pendingPages) {
        const page = await documentHandle.getPage(pending.pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.4, 260 / baseViewport.width) });
        const rendered = document.createElement("canvas");
        rendered.width = Math.max(1, Math.ceil(viewport.width));
        rendered.height = Math.max(1, Math.ceil(viewport.height));
        await page.render({ canvasContext: rendered.getContext("2d"), viewport }).promise;
        renderedByIndex.set(index, rendered);
        page.cleanup();
      }
    } finally {
      if (documentHandle) {
        await documentHandle.cleanup().catch(() => {});
        await documentHandle.destroy().catch(() => {});
      } else {
        await loadingTask.destroy().catch(() => {});
      }
    }
  }
  if (state.reviewSession !== session) return;
  for (const [index, rendered] of renderedByIndex) {
    const canvas = elements.reviewList.querySelector(`[data-preview-index="${index}"]`);
    if (!canvas) throw integrityError("REVIEW_PREVIEW_FAILED");
    copyRenderedCanvas(rendered, canvas);
  }
}

async function beginResultReview(session, context) {
  state.reviewSession = session;
  state.reviewContext = context;
  state.reviewPreviewReady = session.unidentified.length === 0;
  state.reviewPreviewPending = session.unidentified.length > 0 ? 1 : 0;
  state.status = "review";
  diagnosticTracker?.enterPhase("reviewing", diagnosticCounts());
  renderDiagnostics();
  setProgress("progressReviewRequired", 92, "reviewRequiredDetail");
  renderReview();
  if (session.unidentified.length > 0) {
    try {
      await renderReviewPreviews(session);
      if (state.reviewSession !== session) return;
      state.reviewPreviewReady = true;
      state.reviewPreviewPending = 0;
      elements.reviewList.querySelectorAll(".review-preview-button").forEach((button) => {
        button.disabled = false;
      });
    } catch (error) {
      state.reviewPreviewPending = 0;
      error.diagnosticCode = "REVIEW_PREVIEW_FAILED";
      throw error;
    }
  }
  updateControls();
  elements.reviewTitle.focus({ preventScroll: true });
  elements.reviewCard.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

function renderResults() {
  const hasResults = state.results.length > 0;
  elements.resultsCard.hidden = !hasResults;
  const showMaster = (state.mode === "pcl" || state.mode === "tre-pcl") && hasResults;
  elements.downloadAll.hidden = !(showMaster || (state.mode === "split" && state.results.length >= 2));
  elements.downloadAll.disabled = isLocked()
    || (state.mode === "pcl" && showMaster && !state.pclGlobalSummary?.masterAvailable)
    || (state.mode === "tre-pcl" && showMaster && !state.summary?.masterAvailable);
  elements.downloadAll.textContent = state.creatingZip
    ? t("creatingZip")
    : t(state.mode === "tre-pcl" ? "downloadTrePclZip" : showMaster ? "downloadMaster" : "downloadZip");
  elements.resultsTools.hidden = !(state.mode === "split" || state.mode === "pcl" || state.mode === "tre-pcl") || !hasResults;
  elements.resultsAddMore.hidden = state.mode === "tre-pcl";
  elements.resultsList.replaceChildren();
  renderSummary();
  renderOperationSummary();

  const reviewCount = state.results.filter((result) => state.mode === "pcl"
    ? result.plan.status !== "satisfactory"
    : state.mode === "tre-pcl"
      ? result.status !== "satisfactory"
      : result.label === UNIDENTIFIED_LABEL).length;
  elements.filterReview.disabled = reviewCount === 0;
  elements.filterReview.textContent = state.mode === "pcl" || state.mode === "tre-pcl"
    ? `${t("filterPclReview")} (${reviewCount})`
    : t("filterReviewCount", { count: reviewCount });
  elements.filterAll.classList.toggle("is-active", state.resultFilter === "all");
  elements.filterReview.classList.toggle("is-active", state.resultFilter === "review");
  elements.filterAll.setAttribute("aria-pressed", String(state.resultFilter === "all"));
  elements.filterReview.setAttribute("aria-pressed", String(state.resultFilter === "review"));

  const matches = filteredResults();
  const visible = matches.slice(0, state.visibleResultCount);
  for (const result of visible) elements.resultsList.append(renderResultRow(result));

  if (matches.length === 0 && hasResults) {
    const empty = document.createElement("li");
    empty.className = "results-empty";
    empty.textContent = t("noFilterResults");
    elements.resultsList.append(empty);
  }

  elements.resultCount.textContent = state.mode !== "merge"
    ? t("resultCount", { visible: visible.length, total: matches.length, searching: Boolean(state.resultQuery) })
    : "";
  elements.loadMoreRow.hidden = visible.length >= matches.length;
  updateControls();
}

function summarizeSources(sources) {
  const totalPages = sources.reduce((total, source) => total + source.pages.length, 0);
  const unidentifiedPages = sources.reduce((total, source) => total + source.pages
    .filter((page) => canonicalLabel(page.label) === UNIDENTIFIED_LABEL).length, 0);
  return { totalPages, identifiedPages: totalPages - unidentifiedPages, unidentifiedPages };
}

async function buildStandardOutcome(mode, sources) {
  if (mode === "split") {
    state.results = await buildGroupedPdfs(sources);
    state.operationSummary = null;
  } else {
    const merged = await buildMergedPdf(sources);
    state.results = merged.results;
    state.operationSummary = merged.operationSummary;
  }
  state.summary = { ...summarizeSources(sources), resultCount: state.results.length };
}

async function finishSuccessfulProcessing(mode) {
  checkCancelled();
  diagnosticTracker?.enterPhase("validating", diagnosticCounts());
  await validateResultsIntegrity(mode);
  const unidentifiedPages = state.summary?.unidentifiedPages || 0;
  const requiresAttention = mode === "pcl"
    ? state.results.some((result) => result.plan.status !== "satisfactory")
    : mode === "tre-pcl"
      ? state.results.some((result) => result.status !== "satisfactory")
      : unidentifiedPages > 0;
  diagnosticTracker?.complete(requiresAttention ? "completed_with_review" : "completed", diagnosticCounts());
  state.status = "success";
  state.reviewSession = null;
  state.reviewContext = null;
  state.reviewPreviewReady = false;
  state.reviewPreviewPending = 0;
  renderDiagnostics();
  renderReview();
  renderResults();
  setProgress("progressFinished", 100, "finishedDetail", {
    count: state.results.length,
    reviewCount: unidentifiedPages,
  });
  elements.cancelButton.hidden = true;
  setToast(mode === "pcl" ? "pclCreated" : mode === "tre-pcl" ? "trePclCreated" : mode === "split" ? "splitCreated" : "mergeCreated", {
    count: state.results.length,
    available: state.summary?.available || 0,
    missing: state.summary?.missing || 0,
    conflicts: state.summary?.conflicts || 0,
    reviewCount: unidentifiedPages,
    attention: mode === "pcl"
      ? state.results.filter((result) => result.plan.status !== "satisfactory").length
      : mode === "tre-pcl"
        ? state.results.filter((result) => result.status !== "satisfactory").length
        : 0,
  }, requiresAttention);
  elements.resultsTitle.focus({ preventScroll: true });
  elements.resultsCard.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

async function confirmCurrentReview() {
  if (
    !state.reviewSession
    || state.busy
    || !state.reviewPreviewReady
    || state.reviewPreviewPending > 0
  ) return;
  const activeSession = state.reviewSession;
  let confirmed;
  try {
    confirmed = window.PdfNicaesReview.confirm(activeSession, currentReviewDecisions());
  } catch (error) {
    elements.reviewValidation.textContent = t(error.code === "REVIEW_CODE_INVALID"
      ? "reviewCodeInvalid"
      : "reviewIncomplete");
    elements.reviewValidation.hidden = false;
    elements.reviewValidation.focus?.();
    return;
  }

  const context = state.reviewContext;
  state.busy = true;
  state.status = "processing";
  state.manualAssignmentCount += confirmed.manualAssignmentCount;
  state.keptUnidentifiedCount += confirmed.keptUnidentifiedCount;
  elements.reviewValidation.hidden = true;
  setProgress("progressApplyingReview", 94, "applyingReviewDetail");
  updateControls();
  try {
    if (context.mode === "merge") {
      const replacements = describeMergeReplacements(confirmed.sources);
      if (JSON.stringify(replacements) !== JSON.stringify(activeSession.replacements)) {
        const recalculatedSession = window.PdfNicaesReview.createSession({
          mode: "merge",
          sources: confirmed.sources,
          replacements,
          resolvedPages: activeSession.unidentified,
        });
        await beginResultReview(recalculatedSession, context);
        return;
      }
    }
    diagnosticTracker?.enterPhase("building_result", diagnosticCounts());
    if (context.mode === "pcl") {
      const outcome = await buildPclOutcome({ ...context.pcl, sources: confirmed.sources });
      state.results = outcome.results;
      state.summary = outcome.summary;
    } else {
      await buildStandardOutcome(context.mode, confirmed.sources);
    }
    await finishSuccessfulProcessing(context.mode);
    setToast("reviewConfirmed");
  } catch (error) {
    console.error(error);
    state.results = [];
    state.status = "error";
    setProgressError(error?.diagnosticCode === "REVIEW_PREVIEW_FAILED"
      ? "errorReviewPreview"
      : friendlyPdfError(error));
    const incident = diagnosticTracker?.recordIncident(
      error?.diagnosticCode || "REVIEW_CONFIRMATION_FAILED",
      diagnosticCounts(),
    );
    renderDiagnostics();
    await incident;
    renderDiagnostics();
  } finally {
    state.busy = false;
    updateControls();
    renderResults();
  }
}

async function process(mode) {
  const hasInputs = mode === "tre-pcl"
    ? state.treFiles.length > 0 && state.pclFiles.length > 0
    : state.files.length > 0 && (mode !== "pcl" || state.pclFiles.length > 0);
  if (isLocked() || !hasInputs) return;
  state.mode = mode;
  state.diagnosticPagesInspected = 0;
  state.diagnosticOcrPages = 0;
  state.diagnosticPagesTotal = 0;
  state.diagnosticDuplicatePdfCount = 0;
  state.diagnosticProcessedPdfCount = 0;
  state.diagnosticIdentifiedPages = 0;
  state.diagnosticUnidentifiedPages = 0;
  state.manualAssignmentCount = 0;
  state.keptUnidentifiedCount = 0;
  diagnosticTracker?.start({
    mode,
    pdfCount: mode === "tre-pcl" ? 0 : state.files.length,
    pclCount: mode === "pcl" || mode === "tre-pcl" ? state.pclFiles.length : 0,
    treCount: mode === "tre-pcl" ? state.treFiles.length : 0,
  });
  renderDiagnostics();
  if (mode !== "tre-pcl" && (!window.pdfjsLib || !window.PDFLib)) {
    state.status = "error";
    setProgressError("errorPdfTools");
    const incident = diagnosticTracker?.recordIncident("PDF_TOOLS_UNAVAILABLE", diagnosticCounts());
    renderDiagnostics();
    await incident;
    renderDiagnostics();
    elements.progressLabel.focus();
    return;
  }
  if ((mode === "pcl" && (!window.PclDomain || !window.ZipWriter))
    || (mode === "tre-pcl" && (!window.PclDomain || !window.TrePclDomain || !window.ZipWriter))) {
    state.status = "error";
    const messageKey = mode === "tre-pcl" ? "errorTrePclTools" : "errorPclTools";
    setProgressError(messageKey);
    const incident = diagnosticTracker?.recordIncident(mode === "tre-pcl" ? "TRE_PCL_TOOLS_UNAVAILABLE" : "PCL_TOOLS_UNAVAILABLE", diagnosticCounts());
    renderDiagnostics();
    await incident;
    renderDiagnostics();
    elements.progressLabel.focus();
    return;
  }

  state.status = "processing";
  hideToast();
  state.busy = true;
  state.cancelRequested = false;
  state.currentFileIndex = -1;
  state.fileIssues.clear();
  state.results = [];
  state.summary = null;
  state.operationSummary = null;
  state.pclSources = new Map();
  state.pclGlobalSummary = null;
  let ocrWorker = null;
  renderResults();
  renderFiles();
  updateControls();
  elements.cancelButton.disabled = false;
  elements.cancelButton.textContent = t("cancel");
  const inputCount = mode === "tre-pcl"
    ? state.treFiles.length + state.pclFiles.length
    : state.files.length + (mode === "pcl" ? state.pclFiles.length : 0);
  setProgress("progressPreparing", 0, "queuedFiles", { count: inputCount });

  try {
    const ensureOcrWorker = async () => {
      checkCancelled();
      if (ocrWorker) return ocrWorker;
      diagnosticTracker?.enterPhase("ocr", diagnosticCounts());
      renderDiagnostics();
      const ocrInitStartedAt = window.performance?.now?.() ?? Date.now();
      const ocrElapsedMs = () => Math.max(
        0,
        Math.round((window.performance?.now?.() ?? Date.now()) - ocrInitStartedAt),
      );
      if (!window.Tesseract) {
        diagnosticTracker?.recordOcrInit({
          status: "unavailable",
          stage: "not_started",
          elapsedMs: ocrElapsedMs(),
          timeoutMs: OCR_LOAD_TIMEOUT_MS,
          progressPercent: 0,
          resources: {},
        });
        const error = new Error(t("errorOcrLoad"));
        error.diagnosticCode = "OCR_UNAVAILABLE";
        throw error;
      }
      setProgress("progressLoadingOcr", 1, "loadingOcrDetail");
      diagnosticTracker?.recordOcrInit({
        status: "checking",
        stage: "preflight",
        elapsedMs: 0,
        timeoutMs: OCR_LOAD_TIMEOUT_MS,
        progressPercent: 0,
        resources: {},
      });
      let resourceChecks = {};
      if (typeof window.PdfNicaesOcr?.probeResources === "function") {
        resourceChecks = await window.PdfNicaesOcr.probeResources(TESSERACT_RESOURCE_PATHS, {
          timeoutMs: OCR_RESOURCE_TIMEOUT_MS,
        });
      } else {
        resourceChecks = Object.fromEntries(Object.keys(TESSERACT_RESOURCE_PATHS).map((name) => [name, {
          outcome: "unsupported",
          httpStatus: 0,
          durationMs: 0,
        }]));
      }
      diagnosticTracker?.recordOcrInit({
        status: "initializing",
        stage: "worker",
        elapsedMs: ocrElapsedMs(),
        resources: resourceChecks,
      });
      const createTimeoutError = () => {
        const error = new Error(t("errorOcrLoad"));
        error.diagnosticCode = "OCR_INIT_TIMEOUT";
        return error;
      };
      let ocrInitSettled = false;
      try {
        if (typeof window.PdfNicaesOcr?.createWithTimeout !== "function") {
          throw new Error("OCR loader unavailable");
        }
        const remainingTimeoutMs = Math.max(1, OCR_LOAD_TIMEOUT_MS - ocrElapsedMs());
        ocrWorker = await window.PdfNicaesOcr.createWithTimeout(
          () => Tesseract.createWorker("eng", 1, {
            workerPath: TESSERACT_WORKER_PATH,
            corePath: TESSERACT_CORE_PATH,
            langPath: TESSERACT_LANGUAGE_PATH,
            logger: (message) => {
              if (ocrInitSettled) return;
              const stage = window.PdfNicaesOcr.stageFromStatus?.(message?.status) || "unknown";
              const progress = Number(message?.progress);
              diagnosticTracker?.recordOcrInit({
                status: "initializing",
                ...(stage === "unknown" ? {} : { stage }),
                elapsedMs: ocrElapsedMs(),
                ...(Number.isFinite(progress)
                  ? { progressPercent: Math.max(0, Math.min(100, Math.round(progress * 100))) }
                  : {}),
              });
            },
          }),
          remainingTimeoutMs,
          createTimeoutError,
        );
        ocrInitSettled = true;
        diagnosticTracker?.recordOcrInit({
          status: "ready",
          stage: "ready",
          elapsedMs: ocrElapsedMs(),
          progressPercent: 100,
        });
      } catch (error) {
        ocrInitSettled = true;
        const failure = error?.diagnosticCode
          ? error
          : Object.assign(new Error(t("errorOcrLoad"), { cause: error }), {
            diagnosticCode: "OCR_INIT_FAILED",
          });
        diagnosticTracker?.recordOcrInit({
          status: failure.diagnosticCode === "OCR_INIT_TIMEOUT" ? "timeout" : "failed",
          elapsedMs: ocrElapsedMs(),
        });
        throw failure;
      }
      checkCancelled();
      diagnosticTracker?.enterPhase(mode === "pcl" ? "indexing" : "reading_pdf", diagnosticCounts());
      return ocrWorker;
    };
    let reviewSession = null;
    let reviewContext = null;
    if (mode === "tre-pcl") {
      await buildTrePclOutcome();
      await finishSuccessfulProcessing(mode);
      return;
    }
    if (mode === "pcl") {
      const pclOutcome = await processPclMode(ensureOcrWorker);
      state.results = pclOutcome.results;
      state.summary = pclOutcome.summary;
      reviewSession = window.PdfNicaesReview.createSession({
        mode,
        sources: pclOutcome.sources,
      });
      reviewContext = {
        mode,
        suggestions: [...new Set(pclOutcome.requests.flatMap((request) => request.parsed.codes))],
        pcl: {
          requests: pclOutcome.requests,
          duplicatePdfs: pclOutcome.duplicatePdfs,
          reportLanguage: pclOutcome.reportLanguage,
        },
      };
    } else {
      diagnosticTracker?.enterPhase("reading_pdf", diagnosticCounts());
      const inspectedFiles = [];
      const seenHashes = new Map();
      for (let index = 0; index < state.files.length; index += 1) {
        checkCancelled();
        const inspected = await inspectFile(
          state.files[index],
          index,
          state.files.length,
          ensureOcrWorker,
          { hashContent: true, seenHashes },
        );
        state.diagnosticProcessedPdfCount += 1;
        if (inspected.duplicateOf) state.diagnosticDuplicatePdfCount += 1;
        else inspectedFiles.push(inspected);
      }
      checkCancelled();
      const identifiedPages = inspectedFiles.reduce(
        (total, inspected) => total + inspected.pages.filter((page) => page.label !== UNIDENTIFIED_LABEL).length,
        0,
      );
      const totalPages = inspectedFiles.reduce((total, inspected) => total + inspected.pages.length, 0);
      state.summary = {
        totalPages,
        identifiedPages,
        unidentifiedPages: totalPages - identifiedPages,
        resultCount: 0,
      };
      reviewSession = window.PdfNicaesReview.createSession({
        mode,
        sources: inspectedFiles,
        replacements: mode === "merge" ? describeMergeReplacements(inspectedFiles) : [],
      });
      reviewContext = { mode, suggestions: [] };
      if (!reviewSession.required) {
        diagnosticTracker?.enterPhase("building_result", diagnosticCounts());
        await buildStandardOutcome(mode, inspectedFiles);
      }
    }
    if (reviewSession?.required) {
      state.results = [];
      state.operationSummary = null;
      await beginResultReview(reviewSession, reviewContext);
      return;
    }
    await finishSuccessfulProcessing(mode);
  } catch (error) {
    const failureCounts = diagnosticCounts();
    state.results = [];
    state.summary = null;
    state.operationSummary = null;
    state.pclSources = new Map();
    state.pclGlobalSummary = null;
    renderResults();
    if (error?.name === "AbortError") {
      state.status = "cancelled";
      diagnosticTracker?.cancel(failureCounts);
      renderDiagnostics();
      setProgressCancelled();
      setToast("cancelledToast");
    } else {
      console.error(error);
      state.status = "error";
      const friendlyMessageKey = error?.diagnosticCode === "REVIEW_PREVIEW_FAILED"
        ? "errorReviewPreview"
        : mode === "tre-pcl"
          ? error?.diagnosticCode === "TRE_PCL_TOOLS_UNAVAILABLE"
            ? "errorTrePclTools"
            : String(error?.diagnosticCode || "").startsWith("TRE_PCL_")
              ? "errorTrePclIntegrity"
              : "errorTrePclRead"
          : mode === "pcl" && String(error?.message || "").includes("PCL tools")
            ? "errorPclTools"
            : friendlyPdfError(error);
      const affectedFile = state.files[state.currentFileIndex];
      if (affectedFile) state.fileIssues.set(fileKey(affectedFile), friendlyMessageKey);
      renderFiles();
      setProgressError(friendlyMessageKey);
      elements.progressLabel.focus();
      const incident = diagnosticTracker?.recordIncident(
        diagnosticErrorCode(friendlyMessageKey, error),
        failureCounts,
      );
      renderDiagnostics();
      await incident;
      renderDiagnostics();
    }
  } finally {
    if (ocrWorker) {
      await ocrWorker.terminate().catch(() => {});
    }
    state.busy = false;
    state.cancelRequested = false;
    state.currentFileIndex = -1;
    updateControls();
    renderResults();
  }
}

elements.fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files, state.pendingReplaceIndex);
  state.pendingReplaceIndex = null;
  event.target.value = "";
});
elements.fileInput.addEventListener("cancel", () => {
  state.pendingReplaceIndex = null;
});

elements.pclFileInput.addEventListener("change", (event) => {
  addPclFiles(event.target.files);
  event.target.value = "";
});

elements.treFileInput.addEventListener("change", (event) => {
  addTreFiles(event.target.files);
  event.target.value = "";
});

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("is-dragging");
  });
}
elements.dropzone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
for (const button of [elements.pickFiles, elements.addMoreFiles, elements.resultsAddMore]) {
  button.addEventListener("click", () => {
    if (isLocked()) return;
    state.pendingReplaceIndex = null;
    elements.fileInput.click();
  });
}
elements.loadExample.addEventListener("click", loadExampleFiles);

for (const eventName of ["dragenter", "dragover"]) {
  elements.pclDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.pclDropzone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.pclDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.pclDropzone.classList.remove("is-dragging");
  });
}
elements.pclDropzone.addEventListener("drop", (event) => addPclFiles(event.dataTransfer.files));
for (const eventName of ["dragenter", "dragover"]) {
  elements.treDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.treDropzone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.treDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.treDropzone.classList.remove("is-dragging");
  });
}
elements.treDropzone.addEventListener("drop", (event) => addTreFiles(event.dataTransfer.files));
for (const button of [elements.pickPclFiles, elements.addMorePclFiles]) {
  button.addEventListener("click", () => {
    if (!isLocked()) elements.pclFileInput.click();
  });
}
for (const button of [elements.pickTreFiles, elements.addMoreTreFiles]) {
  button.addEventListener("click", () => {
    if (!isLocked()) elements.treFileInput.click();
  });
}

elements.clearFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.files = [];
  state.fileIssues.clear();
  clearOutput();
  renderFiles();
  setToast("removedAllToast");
});

elements.clearPclFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.pclFiles = [];
  clearOutput();
  renderPclFiles();
  setToast("removedAllPclsToast");
});

elements.clearTreFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.treFiles = [];
  clearOutput();
  renderTreFiles();
  setToast("treFilesRemovedToast");
});

elements.showMoreFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.visibleFileCount += 100;
  renderFiles();
  elements.showMoreFiles.focus();
});

elements.showMorePclFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.visiblePclFileCount += 100;
  renderPclFiles();
  elements.showMorePclFiles.focus();
});

elements.showMoreTreFiles.addEventListener("click", () => {
  if (isLocked()) return;
  state.visibleTreFileCount += 100;
  renderTreFiles();
  elements.showMoreTreFiles.focus();
});

elements.modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked || isLocked()) return;
    state.mode = input.value;
    state.operationSelected = true;
    clearOutput();
    renderFiles();
    renderPclFiles();
    renderTreFiles();
  });
});

elements.processButton.addEventListener("click", () => process(state.mode));
elements.mobileProcessButton.addEventListener("click", () => process(state.mode));
elements.cancelButton.addEventListener("click", () => {
  if (!state.busy || state.cancelRequested) return;
  state.cancelRequested = true;
  elements.cancelButton.disabled = true;
  elements.cancelButton.textContent = t("cancelling");
  if (state.progressMessage) {
    state.progressMessage.detailKey = "cancellingDetail";
    state.progressMessage.params = {};
    renderProgressMessage();
  }
});

elements.keepAllUnidentified.addEventListener("click", () => {
  if (
    !state.reviewSession
    || state.busy
    || !state.reviewPreviewReady
    || state.reviewPreviewPending > 0
  ) return;
  if (!window.confirm(t("keepAllConfirm"))) return;
  elements.reviewList.querySelectorAll('.review-action[value="keep"]').forEach((input) => {
    input.checked = true;
  });
  elements.reviewValidation.hidden = true;
});

elements.confirmReview.addEventListener("click", confirmCurrentReview);

elements.restartReview.addEventListener("click", () => {
  if (!state.reviewSession || state.busy) return;
  if (diagnosticTracker?.getCurrent()?.outcome === "processing") {
    diagnosticTracker.cancel(diagnosticCounts());
  }
  state.reviewSession = null;
  state.reviewContext = null;
  state.reviewPreviewReady = false;
  state.reviewPreviewPending = 0;
  state.status = "ready";
  clearOutput();
  renderDiagnostics();
  renderReview();
  renderFiles();
  renderPclFiles();
  updateControls();
  elements.addMoreFiles.focus();
});

elements.downloadAll.addEventListener("click", downloadResultsAsZip);
elements.resultSearch.addEventListener("input", (event) => {
  state.resultQuery = event.target.value;
  state.visibleResultCount = 30;
  renderResults();
});
elements.filterAll.addEventListener("click", () => {
  state.resultFilter = "all";
  state.visibleResultCount = 30;
  renderResults();
});
elements.filterReview.addEventListener("click", () => {
  state.resultFilter = "review";
  state.visibleResultCount = 30;
  renderResults();
});
elements.loadMore.addEventListener("click", () => {
  state.visibleResultCount += 30;
  renderResults();
  elements.loadMore.focus();
});

elements.startOver.addEventListener("click", () => {
  if (isLocked()) return;
  state.files = [];
  state.treFiles = [];
  state.pclFiles = [];
  state.visibleFileCount = 100;
  state.visibleTreFileCount = 100;
  state.visiblePclFileCount = 100;
  state.fileIssues.clear();
  state.status = "idle";
  clearOutput();
  renderFiles();
  renderPclFiles();
  renderTreFiles();
  elements.pickFiles.focus();
  elements.dropzone.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "center",
  });
  setToast("readyAgainToast");
});

elements.languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

elements.themeToggle.addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

elements.copyExecutionId.addEventListener("click", async () => {
  const executionId = diagnosticTracker?.getCurrent()?.executionId;
  if (!executionId) return;
  try {
    await navigator.clipboard.writeText(executionId);
  } catch {
    const input = document.createElement("textarea");
    input.value = executionId;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  setToast("executionIdCopied");
});

elements.downloadDiagnostic.addEventListener("click", () => {
  downloadDiagnosticReport(diagnosticTracker?.getCurrent());
});

elements.reportIncorrect.addEventListener("click", openIncidentPreview);

elements.recentDiagnosticsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-execution-id]");
  if (!button) return;
  const report = diagnosticTracker?.getRecent()
    .find((item) => item.executionId === button.dataset.executionId);
  downloadDiagnosticReport(report);
});

elements.downloadIncidentPreview.addEventListener("click", async () => {
  elements.downloadIncidentPreview.disabled = true;
  elements.sendIncidentReport.disabled = true;
  try {
    const report = await diagnosticTracker?.recordIncident(
      "USER_REPORTED_INCORRECT",
      diagnosticCounts(),
      { send: false },
    );
    downloadDiagnosticReport(report, "incorrectDownloaded");
    elements.diagnosticDialog.close();
    renderDiagnostics();
  } finally {
    elements.downloadIncidentPreview.disabled = false;
    elements.sendIncidentReport.disabled = false;
  }
});

elements.sendIncidentReport.addEventListener("click", async () => {
  elements.downloadIncidentPreview.disabled = true;
  elements.sendIncidentReport.disabled = true;
  try {
    const incident = diagnosticTracker?.recordIncident(
      "USER_REPORTED_INCORRECT",
      diagnosticCounts(),
    );
    renderDiagnostics();
    const report = await incident;
    elements.diagnosticDialog.close();
    renderDiagnostics();
    setToast(report?.remoteStatus === "sent" ? "incorrectReported" : "diagnosticStatusNotSent", {}, report?.remoteStatus === "not_sent");
  } finally {
    elements.downloadIncidentPreview.disabled = false;
    elements.sendIncidentReport.disabled = false;
  }
});

applyTranslations();
