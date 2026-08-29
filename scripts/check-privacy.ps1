param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$excludedDirectories = @(
  ".git", "node_modules", "dist", "out", "release",
  ".electron-debug-cache", ".electron-debug-profile", ".dbg"
)
$forbiddenFiles = @(
  "jiqima.json", "yuming.json", "dingshijiance.json"
)
$allowedExamples = @(
  "yuming.example.json", "dingshijiance.example.json", ".env.example"
)

$files = Get-ChildItem -LiteralPath $rootPath -Recurse -Force -File | Where-Object {
  $relative = $_.FullName.Substring($rootPath.Length).TrimStart([char[]]@('\', '/'))
  $parts = $relative -split "[\\/]"
  -not ($parts | Where-Object { $excludedDirectories -contains $_ })
}

$issues = [System.Collections.Generic.List[string]]::new()
foreach ($file in $files) {
  $relative = $file.FullName.Substring($rootPath.Length).TrimStart([char[]]@('\', '/'))
  if ($forbiddenFiles -contains $file.Name) {
    $issues.Add("runtime-file: $relative")
  }
  if ($allowedExamples -notcontains $file.Name -and $file.Name -match '^\.env($|\.)') {
    $issues.Add("environment-file: $relative")
  }
  if ($file.Extension -match '(?i)^\.(pem|key|p12|pfx)$') {
    $issues.Add("private-key-file: $relative")
  }
}

$textFiles = $files | Where-Object {
  $_.FullName -ne $PSCommandPath -and
  $_.Length -le 5MB -and
  $_.Extension -match '(?i)^\.(js|cjs|mjs|json|md|html|css|txt|env|ps1|yml|yaml)$'
}
$patterns = [ordered]@{
  "private-key" = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  "aws-access-key" = 'AKIA[0-9A-Z]{16}'
  "github-token" = 'gh[pousr]_[A-Za-z0-9]{30,}'
  "openai-style-key" = 'sk-[A-Za-z0-9_-]{20,}'
  "slack-token" = 'xox[baprs]-[A-Za-z0-9-]{10,}'
  "jwt" = 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
  "windows-user-path" = '(?i)[A-Z]:\\Users\\[^\\\s"'']+'
  "deployed-bspapp-backend" = '(?i)https://[^\s"'']+\.(?:next|cdn)\.bspapp\.com'
}

foreach ($name in $patterns.Keys) {
  $hits = $textFiles | Select-String -Pattern $patterns[$name] -AllMatches -ErrorAction SilentlyContinue
  foreach ($hit in $hits) {
    $relative = $hit.Path.Substring($rootPath.Length).TrimStart([char[]]@('\', '/'))
    $issues.Add("${name}: ${relative}:$($hit.LineNumber)")
  }
}

if ($issues.Count -gt 0) {
  Write-Host "Privacy scan failed ($($issues.Count) issue(s)):" -ForegroundColor Red
  $issues | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" }
  exit 1
}

Write-Host "Privacy scan passed: no known sensitive patterns were found." -ForegroundColor Green
exit 0
