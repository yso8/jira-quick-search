$ErrorActionPreference = 'Stop'

$files = @('background.js', 'jira-api.js', 'filter-utils.js', 'options.js', 'search.js', 'recap.js')
foreach ($file in $files) {
  node --check $file
  if ($LASTEXITCODE -ne 0) { throw "Syntaxe JavaScript invalide : $file" }
}

node tests/filter-utils.test.js
if ($LASTEXITCODE -ne 0) { throw 'Les tests JQL ont échoué.' }

node tests/extension-filters.test.js
if ($LASTEXITCODE -ne 0) { throw 'Les tests de contrat des filtres ont échoué.' }

node tests/debug-logger.test.js
if ($LASTEXITCODE -ne 0) { throw 'Les tests du logger ont échoué.' }

Write-Output 'Tests de l’extension réussis.'
