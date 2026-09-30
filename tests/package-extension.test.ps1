$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'scripts\package-extension.ps1'
$outputDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('jira-quick-search-package-test-' + [guid]::NewGuid())
$fixtureRoot = Join-Path $outputDirectory 'fixture'

try {
  & $scriptPath -RepositoryRoot $root -OutputDirectory $outputDirectory

  $zipPath = Join-Path $outputDirectory 'jira-quick-search-v1.0.0.zip'
  if (-not (Test-Path $zipPath)) { throw 'Le ZIP attendu est absent.' }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    if ('manifest.json' -notin $names) { throw "manifest.json n’est pas à la racine du ZIP." }
    if ('src/services/i18n/i18n.js' -notin $names) { throw 'Le service i18n est absent du ZIP.' }
    foreach ($htmlFile in Get-ChildItem -LiteralPath $root -File -Filter '*.html') {
      $html = Get-Content -LiteralPath $htmlFile.FullName -Raw
      foreach ($match in [regex]::Matches($html, '<script\b[^>]*\bsrc\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase')) {
        $reference = $match.Groups[1].Value
        if ($reference -notmatch '^(?:https?:|data:|chrome:)') {
          if ($reference.TrimStart('/') -notin $names) { throw "Script HTML absent du ZIP : $reference (dans $($htmlFile.Name))" }
        }
      }
    }
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

  New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
  Get-ChildItem -LiteralPath $root -File -Include '*.html', '*.js', 'manifest.json' | Copy-Item -Destination $fixtureRoot
  foreach ($directory in @('_locales', 'src', 'vendor')) {
    Copy-Item -LiteralPath (Join-Path $root $directory) -Destination $fixtureRoot -Recurse
  }
  $nestedDependency = Join-Path $fixtureRoot 'src/pages/search/package-relative-fixture.js'
  Set-Content -LiteralPath $nestedDependency -Value '// nested dependency'
  Set-Content -LiteralPath (Join-Path $fixtureRoot 'package-relative-fixture.js') -Value '// root file with the same name'
  Add-Content -LiteralPath (Join-Path $fixtureRoot 'src/pages/search/search.js') -Value "`nimportScripts('package-relative-fixture.js')"
  & $scriptPath -RepositoryRoot $fixtureRoot -OutputDirectory (Join-Path $outputDirectory 'fixture-dist') | Out-Null
  $fixtureZip = Join-Path $outputDirectory 'fixture-dist/jira-quick-search-v1.0.0.zip'
  $fixtureArchive = [System.IO.Compression.ZipFile]::OpenRead($fixtureZip)
  try {
    $fixtureNames = @($fixtureArchive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    if ('src/pages/search/package-relative-fixture.js' -notin $fixtureNames) {
      throw 'La dépendance relative au script est absente du ZIP.'
    }
  } finally {
    $fixtureArchive.Dispose()
  }
} finally {
  if (Test-Path $outputDirectory) { Remove-Item -LiteralPath $outputDirectory -Recurse -Force }
}

Write-Output 'package-extension: test passed'
