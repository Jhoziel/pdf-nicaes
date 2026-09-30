$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$pagesSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
$workersSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

function Invoke-CloudflareBuild {
    & $script:shell (Join-Path $projectRoot 'deploy/build-pages.sh')
    if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }
}

function Clear-CloudflareEnvironment {
    Remove-Item Env:CF_PAGES -ErrorAction SilentlyContinue
    Remove-Item Env:CF_PAGES_BRANCH -ErrorAction SilentlyContinue
    Remove-Item Env:CF_PAGES_COMMIT_SHA -ErrorAction SilentlyContinue
    Remove-Item Env:WORKERS_CI -ErrorAction SilentlyContinue
    Remove-Item Env:WORKERS_CI_BRANCH -ErrorAction SilentlyContinue
    Remove-Item Env:WORKERS_CI_COMMIT_SHA -ErrorAction SilentlyContinue
}

try {
    $shell = 'C:\Program Files\Git\bin\bash.exe'
    if (-not (Test-Path -LiteralPath $shell)) { $shell = 'sh' }

    Clear-CloudflareEnvironment
    $env:CF_PAGES = '1'
    $env:CF_PAGES_BRANCH = 'main'
    $env:CF_PAGES_COMMIT_SHA = $pagesSha

    Invoke-CloudflareBuild

    $buildInfoPath = Join-Path $projectRoot 'dist/build-info.js'
    $diagnosticsPath = Join-Path $projectRoot 'dist/diagnostics.js'
    $reviewDomainPath = Join-Path $projectRoot 'dist/review-domain.js'
    $routesPath = Join-Path $projectRoot 'dist/_routes.json'
    if (-not (Test-Path -LiteralPath $buildInfoPath)) { throw 'The build did not create build-info.js.' }
    if (-not (Test-Path -LiteralPath $diagnosticsPath)) { throw 'The build did not publish diagnostics.js.' }
    if (-not (Test-Path -LiteralPath $reviewDomainPath)) { throw 'The build did not publish review-domain.js.' }
    if (-not (Test-Path -LiteralPath $routesPath)) { throw 'The build did not publish _routes.json.' }

    $buildInfo = Get-Content -Raw -LiteralPath $buildInfoPath
    if ($buildInfo -notmatch [regex]::Escape($pagesSha)) { throw 'The build did not inject CF_PAGES_COMMIT_SHA.' }
    if ($buildInfo -notmatch '"channel":"production"') { throw 'The main branch build was not marked production.' }

    $index = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'dist/index.html')
    if ($index -notmatch 'src="build-info\.js"') { throw 'The deployed HTML does not load build-info.js.' }
    if ($index -notmatch 'src="diagnostics\.js') { throw 'The deployed HTML does not load diagnostics.js.' }
    if ($index -notmatch 'src="review-domain\.js') { throw 'The deployed HTML does not load review-domain.js.' }
    if ($index -notmatch 'href="styles\.css\?v=20260831-1"') {
        throw 'The deployed HTML does not cache-bust the visible version badge styles.'
    }
    if ($index -notmatch '(?s)<header class="topbar".*?id="app-version".*?</header>') {
        throw 'The deployed HTML does not expose the build version in the top bar.'
    }
    if ($index -notmatch 'src="diagnostics\.js\?v=20260831-1"' -or
        $index -notmatch 'src="ocr-loader\.js\?v=20260829-2"' -or
        $index -notmatch 'src="review-domain\.js\?v=20260831-1"' -or
        $index -notmatch 'src="app\.js\?v=20260831-1"') {
        throw 'The deployed HTML does not cache-bust the expanded OCR diagnostics runtime.'
    }

    $routes = Get-Content -Raw -LiteralPath $routesPath | ConvertFrom-Json
    if ($routes.include.Count -ne 1 -or $routes.include[0] -ne '/api/diagnostics') {
        throw 'Pages Functions are not limited to the diagnostics endpoint.'
    }

    $headers = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'dist/_headers')
    if ($headers -notmatch "script-src 'self' 'wasm-unsafe-eval'") {
        throw 'The production CSP does not allow the WebAssembly compilation required by OCR.'
    }
    if ($headers -notmatch '/build-info\.js\s+Cache-Control: no-store') {
        throw 'The deployed version file can be served stale.'
    }
    if ($headers -notmatch '(?m)^/\r?\n\s+Cache-Control: no-store' -or
        $headers -notmatch '(?m)^/index\.html\r?\n\s+Cache-Control: no-store') {
        throw 'The application shell can be served stale after a deployment.'
    }
    if ($headers -notmatch '/assets/vendor/\*\s+Cache-Control: public, max-age=31536000, immutable') {
        throw 'Versioned vendor assets are not cached as immutable.'
    }
    if ($headers -match 'cdnjs|unpkg|jsdelivr|googleapis|gstatic|projectnaptha') {
        throw 'The deployed CSP still allows a third-party runtime host.'
    }

    foreach ($runtimePath in @('dist/index.html', 'dist/styles.css', 'dist/app.js')) {
        $runtimeSource = Get-Content -Raw -LiteralPath (Join-Path $projectRoot $runtimePath)
        if ($runtimeSource -match 'https?://') {
            throw "$runtimePath still contains an external runtime URL."
        }
    }

    foreach ($config in @('deploy/nginx-public-ip.conf', 'deploy/nginx-port-8080.conf')) {
        $nginx = Get-Content -Raw -LiteralPath (Join-Path $projectRoot $config)
        $location = [regex]::Match($nginx, 'location ~ (\S+) \{').Groups[1].Value
        foreach ($asset in @('app.js', 'diagnostics.js', 'pcl-domain.js', 'review-domain.js',
            'zip-writer.js', 'archive-import.js', 'ocr-loader.js', 'styles.css')) {
            if ("/$asset" -notmatch $location) { throw "$config blocks $asset." }
        }
        if ($nginx -notmatch 'Cache-Control "no-cache"') {
            throw "$config does not revalidate application resources."
        }
    }

    $manifestPath = Join-Path $projectRoot 'dist/assets/vendor/manifest.sha256'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'The vendor checksum manifest was not published.' }
    foreach ($line in Get-Content -LiteralPath $manifestPath) {
        if ($line -notmatch '^(?<hash>[0-9a-f]{64})  (?<path>assets/vendor/.+)$') {
            throw "Invalid vendor manifest line: $line"
        }
        $assetPath = Join-Path (Join-Path $projectRoot 'dist') $Matches.path
        if (-not (Test-Path -LiteralPath $assetPath)) { throw "Missing deployed vendor asset: $($Matches.path)" }
        $asset = Get-Item -LiteralPath $assetPath
        if ($asset.Length -gt 25MB) { throw "Vendor asset exceeds 25 MiB: $($Matches.path)" }
        $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $assetPath).Hash.ToLowerInvariant()
        if ($actualHash -ne $Matches.hash) { throw "Vendor checksum mismatch: $($Matches.path)" }
    }

    Clear-CloudflareEnvironment
    $env:WORKERS_CI = '1'
    $env:WORKERS_CI_BRANCH = 'main'
    $env:WORKERS_CI_COMMIT_SHA = $workersSha

    Invoke-CloudflareBuild

    $workersBuildInfo = Get-Content -Raw -LiteralPath $buildInfoPath
    if ($workersBuildInfo -notmatch [regex]::Escape($workersSha)) { throw 'The build did not inject WORKERS_CI_COMMIT_SHA.' }
    if ($workersBuildInfo -notmatch '"channel":"production"') { throw 'The Workers main branch build was not marked production.' }
    if (Test-Path -LiteralPath $routesPath) { throw 'The Workers bundle published the Pages-only _routes.json file.' }

    $wrangler = Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'wrangler.jsonc') | ConvertFrom-Json
    if ($wrangler.main -ne './worker.js') { throw 'Wrangler does not declare the Worker entrypoint.' }
    if ($wrangler.assets.binding -ne 'ASSETS') { throw 'Wrangler does not expose the static asset binding.' }
    if ($wrangler.assets.run_worker_first.Count -ne 1 -or $wrangler.assets.run_worker_first[0] -ne '/api/diagnostics') {
        throw 'Wrangler does not route only the diagnostics endpoint through the Worker first.'
    }
    if (-not $wrangler.observability.enabled -or -not $wrangler.observability.logs.enabled -or -not $wrangler.observability.logs.persist) {
        throw 'Wrangler does not persist diagnostic Worker logs.'
    }

    Clear-CloudflareEnvironment
    $env:WORKERS_CI = '1'
    $env:WORKERS_CI_BRANCH = 'feature/diagnostics'
    $env:WORKERS_CI_COMMIT_SHA = $workersSha

    Invoke-CloudflareBuild
    $previewBuildInfo = Get-Content -Raw -LiteralPath $buildInfoPath
    if ($previewBuildInfo -notmatch '"channel":"preview"') { throw 'A Workers feature branch was not marked preview.' }

    $env:WORKERS_CI_COMMIT_SHA = 'missing'
    Invoke-CloudflareBuild
    $fallbackBuildInfo = Get-Content -Raw -LiteralPath $buildInfoPath
    if ($fallbackBuildInfo -notmatch '"commitSha":"local-dev"' -or $fallbackBuildInfo -notmatch '"channel":"local-dev"') {
        throw 'Missing deployment metadata did not disable production diagnostics.'
    }

    Write-Output '[{"name":"the Cloudflare build supports Pages and Workers metadata","passed":true},{"name":"the Workers deployment exposes only the diagnostic Worker route and persists logs","passed":true}]'
}
catch {
    Write-Output (ConvertTo-Json @(@{
        name = 'the Cloudflare build supports Workers deployment'
        passed = $false
        error = $_.Exception.Message
    }) -Compress)
    exit 1
}
finally {
    Clear-CloudflareEnvironment
}
