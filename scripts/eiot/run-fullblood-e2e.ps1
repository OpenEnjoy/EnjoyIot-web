$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot "fullblood-e2e-runner.js"

Write-Host "[E2E] Running fullblood all-types verification..."
node $runner
