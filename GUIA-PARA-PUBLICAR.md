# Guía para publicar PDF Nicaes

Esta guía te acompaña desde la descarga del proyecto hasta su publicación y mantenimiento. Lee primero las secciones 1 y 2. Cuando tengas los accesos, continúa con los pasos siguientes.

## 1. Qué vas a publicar

PDF Nicaes es una página para separar, combinar y organizar planos PDF. **Publicar** significa colocar los archivos de la página en una computadora de Nicaes que los navegadores puedan visitar. Esa computadora es el **servidor**.

Los PDFs se procesan en la computadora de la persona que abre la página. No se guardan en el servidor. Para esta versión no necesitas instalar Python, Node, Tesseract ni una base de datos en el servidor. El reconocimiento de texto de imágenes, llamado **OCR**, ya viene incluido entre los archivos del sitio.

**Resultado esperado:** tendrás una dirección web que tus compañeros podrán abrir. No se instala un programa en cada computadora.

## 2. Qué debes pedir a Nicaes

Todavía no sabemos qué servidor tienen. No hace falta adivinar ni instalar cosas antes de saberlo. Envía este mensaje a la persona que lo administra:

> Voy a publicar PDF Nicaes, un sitio de archivos estáticos: HTML, CSS, JavaScript, fuentes y recursos de OCR. No requiere base de datos ni procesamiento de PDFs en el servidor.
>
> ¿Qué sistema o panel usan para publicar páginas? ¿Cuál será la dirección del sitio? ¿Podrían asignarme una carpeta exclusiva para esta página y decirme exactamente dónde está? Necesito saber cómo entrar y subir los archivos, y quién configurará HTTPS. También necesito saber si el sitio será solo para la red de Nicaes y cómo se controlará ese acceso.
>
> Si ya hay otras páginas en el servidor, indíquenme cómo publicar esta sin reemplazarlas.

Anota estas respuestas en un lugar privado:

| Dato | Ejemplo de lo que necesitas saber |
| --- | --- |
| Persona de apoyo | Quién administra el servidor |
| Dirección del sitio | La dirección exacta que abrirán los usuarios |
| Forma de entrar | Panel web, SFTP u otra herramienta que te indiquen |
| Carpeta asignada | La carpeta exclusiva donde irá `index.html` |
| HTTPS | Quién deja funcionando la conexión segura |
| Acceso de usuarios | Solo red interna, acceso con cuenta u otra condición |

**Resultado esperado:** sabes dónde subir los archivos y quién te ayuda con la configuración inicial. Guarda las contraseñas fuera de este repositorio.

## 3. Descargar el proyecto y crear el ZIP

Haz estos pasos en tu computadora Windows, usando una cuenta normal.

1. Abre [el repositorio en GitHub](https://github.com/CamiloHerreraDR/pdf-nicaes). Si no puedes verlo, pide acceso al dueño del repositorio.
2. Usa la versión que te indiquen para publicar. Para descargar la rama principal, selecciona `main`, luego **Code → Download ZIP**.
3. En Descargas, haz clic derecho sobre el ZIP y elige **Extraer todo**. Entra en la carpeta extraída hasta ver `README.md`, `index.html` y la carpeta `deploy`.
4. Haz clic en la barra de dirección del Explorador de archivos, escribe `powershell` y presiona Enter. Se abrirá una ventana para escribir comandos dentro de esa carpeta.
5. Copia esta línea completa, pégala en esa ventana y presiona Enter:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy\preparar-sitio.ps1
```

El comando prepara el sitio. La opción `Bypass` permite ejecutar este script en ese proceso; no cambia permanentemente la configuración de PowerShell ([explicación de Microsoft](https://learn.microsoft.com/es-mx/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-7.4)). No necesitas abrirlo como administrador.

6. Espera hasta que aparezca **LISTO. El paquete se creo correctamente.** Encontrarás:

| Archivo o carpeta | Para qué sirve |
| --- | --- |
| `dist/pdf-nicaes-web.zip` | El paquete que debes publicar |
| `dist/sitio/` | Los mismos archivos ya descomprimidos |

**Resultado esperado:** tienes el ZIP para el servidor. El ZIP descargado de GitHub contiene el proyecto completo; el ZIP dentro de `dist` contiene el sitio publicable.

Si aparece **NO SE PUDO PREPARAR EL SITIO**, no continúes con la subida. Lee el mensaje: normalmente falta un archivo o la descarga está incompleta. Extrae una descarga nueva y repite. Un ZIP de una preparación anterior podría seguir en `dist`; no lo confundas con una actualización correcta.

## 4. Subir los archivos

Primero pide que el administrador deje lista la carpeta y dirección acordadas en la sección 2. Si el servidor está vacío o solo tienes una consola SSH, dale el ZIP y pídele que prepare el alojamiento. Los comandos de instalación dependen del servidor.

Cuando ya exista una carpeta web asignada:

1. Entra con la herramienta que te indicaron. **SFTP** es una forma de transferir archivos al servidor; un **panel web** permite hacerlo desde una página de administración.
2. Abre únicamente la carpeta asignada a PDF Nicaes. Si ya hay una versión, haz primero la copia de respaldo de la sección 7.
3. En tu computadora, abre `dist/sitio/` y selecciona todo su contenido. Súbelo conservando las carpetas.
4. Si el panel permite subir y extraer ZIP, puedes subir `pdf-nicaes-web.zip` y extraerlo dentro de la carpeta asignada. Después retira ese ZIP de la carpeta pública.
5. Espera a que termine la transferencia. Comprueba que no haya errores ni archivos pendientes.

Dentro de la carpeta web debes ver algo como esto:

```text
carpeta asignada/
    index.html
    styles.css
    app.js
    build-info.js
    ...otros archivos .js...
    assets/
        nicaes-logo-white.png
        vendor/
```

`index.html` debe quedar directamente en la carpeta asignada. Evita añadir una carpeta extra llamada `sitio` o `pdf-nicaes-web` dentro de ella. Sube todos los archivos del paquete, aunque no reconozcas sus nombres.

**Resultado esperado:** al abrir la dirección indicada por Nicaes aparece PDF Nicaes. No uses doble clic sobre `index.html` para comprobar la publicación: la prueba debe hacerse desde la dirección del sitio.

## 5. Confirmar la configuración con el administrador

Esta parte corresponde a la preparación del servidor. Puedes compartirle esta lista:

- La dirección final debe abrir por **HTTPS**, la conexión segura del navegador, con un certificado válido.
- El servidor debe servir los archivos del paquete, incluido todo `assets/vendor/`, y reconocer los tipos de archivo de JavaScript y fuentes.
- Los recursos deben responder a `GET` y `HEAD`: son las solicitudes con las que el navegador descarga y comprueba los archivos.
- El modelo `eng.traineddata.gz` debe entregarse como archivo comprimido intacto, sin marcarlo como `Content-Encoding: gzip`; la biblioteca de OCR lo descomprime.
- La **caché** es una copia que el navegador guarda para cargar más rápido. Configurar `Cache-Control: no-store` para `/`, `index.html` y `build-info.js`; revalidación para los demás JS y CSS propios; caché larga solo para recursos versionados de `assets/vendor/`.
- Si el servidor aplica una política de seguridad del navegador, debe permitir los recursos locales, los workers y WebAssembly del OCR. Hay detalles en [la documentación técnica](deploy/README.md).
- Si la dirección lleva una subcarpeta, debe terminar con `/` y conservar las rutas relativas de los archivos. Los ejemplos Nginx del repositorio están preparados para la raíz de un sitio.

Esta versión no tiene inicio de sesión. Si Nicaes quiere restringir quién entra, el administrador debe hacerlo en la red o en el alojamiento.

**Resultado esperado:** la dirección y los recursos funcionan para un compañero desde otra computadora de la red prevista.

## 6. Comprobar que funciona

Usa archivos de prueba cuyo resultado conozcas. Para empezar, puedes elegir cada modo y pulsar **Cargar ejemplo de prueba**: la propia página prepara entradas para separar, combinar o generar un paquete PCL. Para probar OCR sí necesitarás un PDF escaneado.

Abre la dirección en Chrome o Edge actualizado y realiza estas comprobaciones:

1. **Pantalla inicial:** se ven el logo, los textos y los botones.
2. **Separar:** carga un PDF con códigos TRUSS conocidos, elige separar y procesa. Descarga un resultado, ábrelo y comprueba sus páginas.
3. **Combinar:** carga dos PDFs. El último de la lista tiene prioridad cuando se repite una TRUSS. Confirma la revisión de reemplazos, descarga y comprueba que se conservó la versión esperada.
4. **Revisar:** si aparece una página sin identificar, revisa la imagen y asigna el código correcto o elige conservarla sin identificar. Confirma para continuar.
5. **OCR:** procesa un PDF escaneado. La primera lectura puede tardar más. Comprueba que termine y revisa las páginas cuyo código no se pudo identificar.
6. **PCL:** carga los PDFs fuente y un PCL de edificio. Genera el paquete, descarga su ZIP y comprueba los PDFs y el reporte de faltantes o conflictos.

**Resultado esperado:** puedes abrir las descargas y su contenido es el esperado. Si un reporte indica TRUSS faltantes, compara los archivos de entrada: eso por sí solo no significa que el servidor esté fallando.

El indicador `local-dev` es normal en este paquete: identifica el modo sin envío remoto de diagnósticos. No significa que el sitio solo pueda usarse en tu computadora. No cambies `build-info.js` para intentar activarlo.

## 7. Actualizar y volver a la versión anterior

### Antes de actualizar

1. Acuerda un momento en que tus compañeros no estén procesando documentos.
2. Descarga una copia **completa** del sitio actual desde su carpeta asignada. Guárdala en tu computadora, por ejemplo en `respaldo-pdf-nicaes-2026-09-15`. Incluye `assets` y guarda por separado cualquier configuración del servidor.
3. Anota qué versión o ZIP vas a publicar y la fecha. Conserva el ZIP anterior fuera de la carpeta pública.
4. Descarga la versión nueva del proyecto y genera nuevamente el paquete siguiendo la sección 3. No edites los archivos JavaScript directamente en el servidor.

### Publicar la actualización

1. Sube todo el contenido del paquete nuevo y reemplaza los archivos del sitio. No borres configuraciones del alojamiento ni archivos de otras páginas.
2. Espera a que termine toda la transferencia antes de avisar que el sitio está disponible.
3. Abre la dirección y presiona `Ctrl + F5` para actualizar la página. Repite las pruebas de la sección 6.

Durante la copia pueden quedar archivos de dos versiones mezclados. Si el administrador dispone de una forma de cambiar toda la carpeta de una vez, pídele que la use.

### Si la actualización falla

1. Avisa que estás restaurando la versión anterior.
2. Vuelve a subir el respaldo completo a la misma carpeta, reemplazando los archivos de la página.
3. Si hace falta retirar archivos que solo existían en la versión fallida, pide al administrador restaurar exactamente la carpeta respaldada sin afectar su configuración.
4. Presiona `Ctrl + F5` y repite las pruebas. Si sigue fallando, pide apoyo antes de hacer más cambios.

**Resultado esperado:** recuperas una versión que ya funcionaba. El servidor no guarda los documentos de trabajo; cada usuario debe conservar sus entradas y descargas en su computadora.

## 8. Resolver problemas comunes

| Problema | Qué comprobar primero | Cuándo pedir ayuda |
| --- | --- | --- |
| No abre la dirección o aparece 404 | Copia la dirección exacta. Comprueba dónde quedó `index.html`. | Si está en la carpeta correcta, pide revisar la dirección y el alojamiento. |
| La página queda en blanco o sin estilo | Comprueba que subiste todos los `.js`, `styles.css` y `assets`. Presiona `Ctrl + F5`. | Si continúa, pide revisar los archivos que el servidor está bloqueando. |
| Aparece una versión anterior | Presiona `Ctrl + F5` o abre una ventana privada. Revisa que actualizaste la carpeta correcta. | Pide revisar la caché del servidor o de la red de distribución, si existe. |
| El OCR falla o queda esperando | Comprueba que se subió todo `assets/vendor/`. Prueba un PDF escaneado pequeño. | Comparte el código técnico y pide revisar los recursos y permisos de la sección 5. |
| No se habilita una descarga | Revisa si hay páginas o reemplazos pendientes de confirmar. | Si aparece un error después de confirmar, descarga el diagnóstico. |
| No encuentras el archivo descargado | Abre las descargas del navegador con `Ctrl + J`. Comprueba espacio disponible y permisos de descarga. | Si aparece un error técnico, comparte su diagnóstico. |
| PowerShell dice que no encuentra el script | Abre PowerShell en la carpeta donde están `README.md` y `deploy`. | Si falta `deploy`, vuelve a extraer el proyecto completo. |
| La computadora bloquea la ejecución del script | Conserva el mensaje y pide apoyo a sistemas. | Pueden preparar el ZIP en otra computadora autorizada; no hace falta desactivar la protección del equipo. |

Para pedir soporte, indica la dirección del sitio, fecha, acción que intentabas hacer, mensaje de error y versión publicada. Si aparece **Descargar diagnóstico**, guarda ese informe y compártelo con quien mantiene la herramienta. Este paquete no envía automáticamente los incidentes a un servidor.

El diagnóstico técnico es distinto del reporte PCL: no envíes PDFs, PCL ni reportes de negocio como parte de una consulta técnica.
