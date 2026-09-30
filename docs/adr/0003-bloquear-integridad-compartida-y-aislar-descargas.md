# Bloquear ante fallos de integridad compartida y aislar las descargas

Una regla de integridad incumplida durante la inspección, indexación o planificación compartida bloqueará todo el resultado de procesamiento, porque cualquier salida parcial podría parecer correcta sin serlo. Un fallo posterior al materializar un artefacto descargable bloqueará solo ese intento, conservará los demás resultados validados y nunca producirá un ZIP maestro incompleto.
