$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json

$requiredFiles = @(
  'background.js', 'src/services/jira/jira-api.js', 'src/services/diagnostics/diagnostic-utils.js', 'src/utils/feedback/feedback-utils.js', 'src/services/diagnostics/debug-logger.js', 'src/utils/search/filter-utils.js', 'search.html', 'src/pages/search/search.js',
  'recap.html', 'src/pages/recap/recap.js', 'options.html', 'src/pages/settings/options.js',
  'src/services/i18n/i18n.js', '_locales/en/messages.json', '_locales/fr/messages.json'
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

if ($manifest.default_locale -ne 'en') { throw 'La locale par défaut doit être en.' }
$manifestMessages = @($manifest.name, $manifest.description, $manifest.action.default_title, $manifest.commands.open_search.description)
$messageKeys = foreach ($message in $manifestMessages) {
  if ($message -notmatch '^__MSG_([A-Za-z0-9_]+)__$') { throw "Message de manifeste non localisé : $message" }
  $Matches[1]
}
foreach ($locale in @('en', 'fr')) {
  $catalogPath = Join-Path $root "_locales/$locale/messages.json"
  try { $catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json } catch { throw "Catalogue invalide : $catalogPath" }
  foreach ($key in $messageKeys) {
    $entry = $catalog.PSObject.Properties[$key]
    if (-not $entry -or -not $entry.Value.message) { throw "Message $key absent du catalogue $locale" }
  }
}

$sourceFiles = Get-ChildItem -Path $root -File -Include *.js,*.html,*.json,*.md -Recurse
$secretPattern = '(?i)(api[_-]?token|password|secret)\s*[:=]\s*["''][^"'']{12,}["'']'
foreach ($file in $sourceFiles) {
  if ((Get-Content -Raw $file.FullName) -match $secretPattern) {
    throw "Valeur ressemblant à un secret détectée dans : $($file.FullName)"
  }
}

Write-Output "Validation réussie : manifeste, fichiers référencés et contrôle de secrets."
