$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json

$requiredFiles = @(
  'background.js', 'jira-api.js', 'diagnostic-utils.js', 'debug-logger.js', 'filter-utils.js', 'search.html', 'search.js',
  'recap.html', 'recap.js', 'options.html', 'options.js'
)

foreach ($relativePath in $requiredFiles) {
  if (-not (Test-Path (Join-Path $root $relativePath))) {
    throw "Fichier requis absent : $relativePath"
  }
}

foreach ($icon in $manifest.icons.PSObject.Properties) {
  if (-not (Test-Path (Join-Path $root $icon.Value))) {
    throw "Icône référencée absente : $($icon.Value)"
  }
}

if ($manifest.manifest_version -ne 3) {
  throw 'Le manifeste doit utiliser Manifest V3.'
}

$sourceFiles = Get-ChildItem -Path $root -File -Include *.js,*.html,*.json,*.md -Recurse
$secretPattern = '(?i)(api[_-]?token|password|secret)\s*[:=]\s*["''][^"'']{12,}["'']'
foreach ($file in $sourceFiles) {
  if ((Get-Content -Raw $file.FullName) -match $secretPattern) {
    throw "Valeur ressemblant à un secret détectée dans : $($file.FullName)"
  }
}

Write-Output "Validation réussie : manifeste, fichiers référencés et contrôle de secrets."
