<#
.SYNOPSIS
  Génère un package ZIP minimal de Jira Quick Search pour Chrome.

.DESCRIPTION
  Construit un staging temporaire à partir des fichiers réellement utilisés par
  l’extension, valide les références locales et les données sensibles, puis
  crée un ZIP versionné dans le dossier de sortie.

.PARAMETER RepositoryRoot
  Racine du dépôt. Par défaut, le dossier parent de scripts/.

.PARAMETER OutputDirectory
  Dossier de sortie du ZIP. Par défaut, dist/ dans la racine du dépôt.

.EXAMPLE
  .\scripts\package-extension.ps1

.EXAMPLE
  Get-Help .\scripts\package-extension.ps1 -Full
##>
[CmdletBinding()]
param(
  [Parameter()]
  [string] $RepositoryRoot = (Split-Path -Parent $PSScriptRoot),

  [Parameter()]
  [string] $OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RepositoryPath([string] $Root, [string] $RelativePath) {
  return [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))
}

function Resolve-LocalReference([string] $RelativeFile, [string] $Reference, [bool] $DocumentRelative) {
  if ($DocumentRelative -or $Reference.StartsWith('/')) { return $Reference.TrimStart('/') }
  $directory = Split-Path $RelativeFile -Parent
  if ($directory) { return Join-Path $directory $Reference }
  return $Reference
}

function Add-StagedFile([string] $RelativePath, [string] $Root, [string] $Staging) {
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return }
  $normalized = $RelativePath.Replace('/', '\').TrimStart('\')
  if ($normalized -match '(^|\\)\.\.?($|\\)') { throw "Chemin relatif invalide : $RelativePath" }
  $source = Resolve-RepositoryPath $Root $normalized
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Fichier référencé absent : $RelativePath" }
  $destination = Join-Path $Staging $normalized
  $parent = Split-Path -Parent $destination
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Copy-Item -LiteralPath $source -Destination $destination -Force
}

function Get-LocalReferences([string] $RelativePath, [string] $Content) {
  $references = New-Object System.Collections.Generic.List[object]
  $patterns = @(
    @{ Regex = '(?i)<(?:script|link)\b[^>]+(?:src|href)\s*=\s*["'']([^"'']+)["'']'; DocumentRelative = $true },
    @{ Regex = '(?i)<img\b[^>]+\bsrc\s*=\s*["'']([^"'']+)["'']'; DocumentRelative = $true },
    @{ Regex = '(?im)^\s*importScripts\s*\(\s*["'']([^"'']+)["'']'; DocumentRelative = $false },
    @{ Regex = '(?im)^\s*import\s+["'']([^"'']+)["'']'; DocumentRelative = $false }
  )
  foreach ($pattern in $patterns) {
    foreach ($match in [regex]::Matches($Content, $pattern.Regex)) {
      $reference = $match.Groups[1].Value
      if ($reference -and $reference -notmatch '^(?:https?:|data:|#|javascript:|mailto:|chrome:)') {
        $references.Add([pscustomobject]@{ Path = $reference; DocumentRelative = $pattern.DocumentRelative })
      }
    }
  }
  return $references
}

function Assert-NoSensitiveContent([string] $Path) {
  $sensitivePatterns = @(
    '(?i)(?:api[_-]?key|api[_-]?token|access[_-]?token|password|secret)\s*[:=]\s*["''][^"'']{8,}["'']',
    '(?i)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    '(?i)(?<![A-Za-z0-9._%+-])(?!(?:(?:vous|nom\.prenom)@entreprise\.com|(?:you|first\.last)@company\.com)\b)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
    '(?i)https://(?!(?:votre-societe|votre-site|your-company|your-site)\.atlassian\.net)[a-z0-9-]+\.atlassian\.net(?:/[^\s"''<>]*)?'
  )
  $content = Get-Content -LiteralPath $Path -Raw
  foreach ($pattern in $sensitivePatterns) {
    if ($content -match $pattern) { throw "Donnée sensible détectée dans le package : $Path" }
  }
}

$root = [System.IO.Path]::GetFullPath($RepositoryRoot)
if (-not (Test-Path -LiteralPath $root -PathType Container)) { throw "Racine du dépôt absente : $root" }

$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'manifest.json est absent.' }
try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json } catch { throw "manifest.json est invalide : $($_.Exception.Message)" }
if (-not $manifest.name -or -not $manifest.version) { throw 'manifest.json doit contenir name et version.' }
if ($manifest.manifest_version -ne 3) { throw 'Le package doit utiliser Manifest V3.' }
if ($manifest.default_locale -ne 'en') { throw 'La locale par défaut doit être en.' }

$manifestMessages = @($manifest.name, $manifest.description, $manifest.action.default_title, $manifest.commands.open_search.description)
$messageKeys = foreach ($message in $manifestMessages) {
  if ($message -notmatch '^__MSG_([A-Za-z0-9_]+)__$') { throw "Message de manifeste non localisé : $message" }
  $Matches[1]
}
foreach ($locale in @('en', 'fr')) {
  $catalogPath = Join-Path $root "_locales/$locale/messages.json"
  if (-not (Test-Path -LiteralPath $catalogPath -PathType Leaf)) { throw "Catalogue absent : $catalogPath" }
  try { $catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json } catch { throw "Catalogue invalide : $catalogPath" }
  foreach ($key in $messageKeys) {
    $entry = $catalog.PSObject.Properties[$key]
    if (-not $entry -or -not $entry.Value.message) { throw "Message $key absent du catalogue $locale" }
  }
}

$output = if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { Join-Path $root 'dist' } else { [System.IO.Path]::GetFullPath($OutputDirectory) }
if (-not (Test-Path -LiteralPath $output)) { New-Item -ItemType Directory -Path $output -Force | Out-Null }

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ('jira-quick-search-staging-' + [guid]::NewGuid().ToString('N'))
$zipName = 'jira-quick-search-v{0}.zip' -f $manifest.version
$zipPath = Join-Path $output $zipName
$included = New-Object System.Collections.Generic.List[string]
$excluded = @('.git', '.github', 'tests', 'scripts', 'AGENTS.md', 'CONTRIBUTING.md', 'SECURITY.md', 'PRIVACY.md', 'README.md', 'images', 'brag-output', '*.mp3', '*.ogg', '*.wav', '*.tmp', '*.env', 'caches', 'dist')

try {
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  Add-StagedFile 'manifest.json' $root $staging
  Add-StagedFile 'background.js' $root $staging
  Add-StagedFile '_locales/en/messages.json' $root $staging
  Add-StagedFile '_locales/fr/messages.json' $root $staging

  foreach ($property in $manifest.icons.PSObject.Properties) { Add-StagedFile $property.Value $root $staging }

  $htmlFiles = Get-ChildItem -LiteralPath $root -File -Filter '*.html'
  foreach ($file in $htmlFiles) {
    Add-StagedFile $file.Name $root $staging
    foreach ($reference in Get-LocalReferences $file.Name (Get-Content -LiteralPath $file.FullName -Raw)) {
      Add-StagedFile (Resolve-LocalReference $file.Name $reference.Path $reference.DocumentRelative) $root $staging
    }
  }

  foreach ($reference in Get-LocalReferences 'background.js' (Get-Content -LiteralPath (Join-Path $root 'background.js') -Raw)) {
    Add-StagedFile (Resolve-LocalReference 'background.js' $reference.Path $reference.DocumentRelative) $root $staging
  }

  $processedReferences = New-Object System.Collections.Generic.HashSet[string]
  do {
    $pendingFiles = @(Get-ChildItem -LiteralPath $staging -File -Include '*.html', '*.js' -Recurse | Where-Object {
      -not $processedReferences.Contains($_.FullName)
    })
    foreach ($file in $pendingFiles) {
      $processedReferences.Add($file.FullName) | Out-Null
      $relativeFile = $file.FullName.Substring($staging.Length).TrimStart('\', '/')
      foreach ($reference in Get-LocalReferences $relativeFile (Get-Content -LiteralPath $file.FullName -Raw)) {
        Add-StagedFile (Resolve-LocalReference $relativeFile $reference.Path $reference.DocumentRelative) $root $staging
      }
    }
  } while (@(Get-ChildItem -LiteralPath $staging -File -Include '*.html', '*.js' -Recurse | Where-Object { -not $processedReferences.Contains($_.FullName) }).Count -gt 0)

  foreach ($file in Get-ChildItem -LiteralPath $staging -File -Recurse) {
    $relative = $file.FullName.Substring($staging.Length).TrimStart('\', '/')
    $included.Add($relative)
    Assert-NoSensitiveContent $file.FullName
  }

  $referenceFiles = Get-ChildItem -LiteralPath $staging -File -Include '*.html', '*.js' -Recurse
  foreach ($file in $referenceFiles) {
    $relativeFile = $file.FullName.Substring($staging.Length).TrimStart('\', '/')
    foreach ($reference in Get-LocalReferences $relativeFile (Get-Content -LiteralPath $file.FullName -Raw)) {
      $candidate = Join-Path $staging (Resolve-LocalReference $relativeFile $reference.Path $reference.DocumentRelative)
      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { throw "Référence locale absente du staging : $($reference.Path) (dans $relativeFile)" }
    }
  }

  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
  $size = (Get-Item -LiteralPath $zipPath).Length

  Write-Output 'Package créé avec succès.'
  Write-Output "ZIP       : $zipPath"
  Write-Output "Version   : $($manifest.version)"
  Write-Output "Taille    : $size octets"
  Write-Output "Fichiers  : $($included.Count)"
  Write-Output 'Inclus    :'
  $included | Sort-Object | ForEach-Object { Write-Output "  - $_" }
  Write-Output 'Exclusions : .git, .github, tests, scripts, documentation, captures, brag-output, audio, temporaires, .env, caches et dist.'
  Write-Output 'Validations : JSON, références locales, Manifest V3 et données sensibles OK.'
} finally {
  if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
}
