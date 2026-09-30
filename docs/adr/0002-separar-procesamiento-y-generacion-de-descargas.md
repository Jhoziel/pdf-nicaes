# Separar procesamiento y generación de descargas

El 100% representará que el análisis y la planificación de resultados terminaron, no que todos los archivos opcionales ya fueron materializados. Los intentos de generar PDFs o ZIP se registrarán como fases posteriores de la misma ejecución porque producir todos los paquetes de antemano aumentaría el consumo de memoria y eliminaría la generación bajo demanda necesaria para lotes grandes. El diagnóstico mantendrá contadores monotónicos de todos los intentos y el detalle de los 24 más recientes para permanecer por debajo de 16 KiB.
