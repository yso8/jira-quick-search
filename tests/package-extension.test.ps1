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
    if ($names | Where-Object { $_ -match '(^|/)(tests|scripts|\.git|\.github|brag-output)(/|$)' }) { throw 'Un fichier de développement est inclus.' }
    if ($names | Where-Object { $_ -match '\.(mp3|ogg|wav|env)$' }) { throw 'Un fichier exclu est inclus.' }
  } finally {
    $archive.Dispose()
  }
} finally {
  if (Test-Path $outputDirectory) { Remove-Item -LiteralPath $outputDirectory -Recurse -Force }
}

Write-Output 'package-extension: test passed'
