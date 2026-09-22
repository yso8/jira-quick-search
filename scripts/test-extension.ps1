$ErrorActionPreference = 'Stop'

$files = @('background.js', 'jira-api.js', 'diagnostic-utils.js', 'feedback-utils.js', 'filter-utils.js', 'options.js', 'search.js', 'recap.js')
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

node tests/diagnostic-utils.test.js
if ($LASTEXITCODE -ne 0) { throw 'Les tests de diagnostic ont échoué.' }

node tests/feedback-utils.test.js
if ($LASTEXITCODE -ne 0) { throw 'Les tests de feedback ont échoué.' }

Write-Output 'Tests de l extension reussis.'
