# Ejecutar desde la carpeta del proyecto; no requiere permisos de administrador.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$sitePath = Join-Path $distRoot 'sitio'
$zipPath = Join-Path $distRoot 'pdf-nicaes-web.zip'
$stagePath = Join-Path $distRoot ('preparacion-' + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)

# Rechazar enlaces evita limpiar o escribir fuera del proyecto por accidente.
function Assert-OutputPath([string] $Path) {
    $fullPath = [IO.Path]::GetFullPath($Path)
    $expectedRoot = [IO.Path]::GetFullPath($distRoot)
    if ($fullPath -ne $expectedRoot -and
        -not $fullPath.StartsWith($expectedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'La carpeta de salida debe estar dentro de dist.'
    }
    $current = $fullPath
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -Force -LiteralPath $current
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "La ruta contiene un enlace de carpetas. Use una carpeta normal: $current"
            }
        }
        $current = Split-Path -Parent $current
    }
    if (Test-Path -LiteralPath $fullPath -PathType Container) {
        $links = @(Get-ChildItem -LiteralPath $fullPath -Force -Recurse |
            Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
        if ($links.Count -gt 0) { throw "La salida contiene enlaces. Revise la carpeta: $fullPath" }
    }
}

try {
    Write-Host 'Preparando los archivos del sitio...'
    $webFiles = @(
        'index.html', 'styles.css', 'app.js', 'diagnostics.js',
        'pcl-domain.js', 'review-domain.js', 'zip-writer.js',
        'archive-import.js', 'ocr-loader.js',
        'assets/nicaes-logo-white.png',
        'assets/vendor/THIRD_PARTY_NOTICES.md', 'assets/vendor/manifest.sha256'
    )
    $manifestPath = Join-Path $projectRoot 'assets/vendor/manifest.sha256'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw 'Falta assets/vendor/manifest.sha256. Descargue y extraiga el proyecto completo.'
    }
    $vendorHashes = @{}
    foreach ($line in Get-Content -Encoding UTF8 -LiteralPath $manifestPath) {
        if ($line -notmatch '^(?<hash>[0-9a-f]{64})  (?<path>assets/vendor/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*/)+[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:js|woff2|gz|md|markdown|txt))$') {
            throw 'La lista de comprobacion de dependencias tiene un formato incorrecto. Descargue el proyecto de nuevo.'
        }
        $relativePath = $Matches.path
        if ($vendorHashes.ContainsKey($relativePath)) { throw "Hay un recurso repetido: $relativePath" }
        $vendorHashes[$relativePath] = $Matches.hash
        $webFiles += $relativePath
    }
    if ($vendorHashes.Count -eq 0) { throw 'La lista de dependencias esta vacia.' }

    foreach ($relativePath in $webFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relativePath) -PathType Leaf)) {
            throw "Falta el archivo $relativePath. Descargue y extraiga el proyecto completo."
        }
    }

    Assert-OutputPath $distRoot
    Assert-OutputPath $stagePath
    New-Item -ItemType Directory -Path $stagePath -Force | Out-Null
    $stagedSite = Join-Path $stagePath 'sitio'
    New-Item -ItemType Directory -Path $stagedSite | Out-Null
    foreach ($relativePath in $webFiles) {
        $destination = Join-Path $stagedSite $relativePath
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $projectRoot $relativePath) -Destination $destination
        if ($vendorHashes.ContainsKey($relativePath)) {
            $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash.ToLowerInvariant()
            if ($actualHash -ne $vendorHashes[$relativePath]) {
                throw "El archivo $relativePath esta incompleto o fue modificado. Descargue el proyecto de nuevo."
            }
        }
    }
    # Un servidor estatico no tiene receptor de incidentes. Ignorar variables de Cloudflare.
    [IO.File]::WriteAllText((Join-Path $stagedSite 'build-info.js'),
        'window.PDF_NICAES_BUILD = Object.freeze({"commitSha":"local-dev","channel":"local-dev"});' + "`n", $utf8)

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $stagedZip = Join-Path $stagePath 'pdf-nicaes-web.zip'
    $archive = [IO.Compression.ZipFile]::Open($stagedZip, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($relativePath in ($webFiles + @('build-info.js'))) {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,
                (Join-Path $stagedSite $relativePath), $relativePath,
                [IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
    finally { $archive.Dispose() }

    # Solo sustituir el paquete anterior cuando el nuevo ya paso la comprobacion.
    Assert-OutputPath $sitePath
    Assert-OutputPath $zipPath
    if (Test-Path -LiteralPath $sitePath) { Remove-Item -LiteralPath $sitePath -Recurse -Force }
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Move-Item -LiteralPath $stagedSite -Destination $sitePath
    Move-Item -LiteralPath $stagedZip -Destination $zipPath
    Write-Host 'LISTO. El paquete se creo correctamente.'
    Write-Host "ZIP para publicar: $zipPath"
    Write-Host "Archivos sin comprimir: $sitePath"
    Write-Host 'Siguiente paso: abra GUIA-PARA-PUBLICAR.md, seccion 4.'
}
catch {
    Write-Host "NO SE PUDO PREPARAR EL SITIO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'No publique un ZIP anterior como si fuera la nueva version. Corrija el problema y repita el comando.'
    exit 1
}
finally {
    if (Test-Path -LiteralPath $stagePath) {
        Assert-OutputPath $stagePath
        Remove-Item -LiteralPath $stagePath -Recurse -Force
    }
}
