$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'scripts\package-extension.ps1'
$outputDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('jira-quick-search-package-test-' + [guid]::NewGuid())

try {
  & $scriptPath -RepositoryRoot $root -OutputDirectory $outputDirectory

  $zipPath = Join-Path $outputDirectory 'jira-quick-search-v1.0.0.zip'
  if (-not (Test-Path $zipPath)) { throw 'Le ZIP attendu est absent.' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $names = @($archive.Entries | ForEach-Object FullName)
    if ('manifest.json' -notin $names) { throw "manifest.json n’est pas à la racine du ZIP." }
    if ('src/services/i18n/i18n.js' -notin $names) { throw 'Le service i18n est absent du ZIP.' }
    foreach ($locale in @('en', 'fr')) {
      if ("_locales/$locale/messages.json" -notin $names) { throw "Catalogue $locale absent de la racine du ZIP." }
    }
    $manifestEntry = $archive.GetEntry('manifest.json')
    $reader = [System.IO.StreamReader]::new($manifestEntry.Open())
    try { $packagedManifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    if ($packagedManifest.default_locale -ne 'en') { throw 'Le manifeste packagé ne définit pas en comme locale par défaut.' }
    foreach ($value in @($packagedManifest.name, $packagedManifest.description, $packagedManifest.action.default_title, $packagedManifest.commands.open_search.description)) {
      if ($value -notmatch '^__MSG_[A-Za-z0-9_]+__$') { throw "Chaîne non localisée dans le manifeste packagé : $value" }
    }
    if ($names | Where-Object { $_ -match '(^|/)(tests|scripts|\.git|\.github|brag-output)(/|$)' }) { throw 'Un fichier de développement est inclus.' }
    if ($names | Where-Object { $_ -match '\.(mp3|ogg|wav|env)$' }) { throw 'Un fichier exclu est inclus.' }
  } finally {
    $archive.Dispose()
  }
} finally {
  if (Test-Path $outputDirectory) { Remove-Item -LiteralPath $outputDirectory -Recurse -Force }
}

Write-Output 'package-extension: test passed'
