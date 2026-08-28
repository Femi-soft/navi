$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\apps\web\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "apps/web/.env.local is missing" }

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$apiKey = Read-Secret "Paste the OpenAI API key"
if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey.Length -lt 20) { throw "The OpenAI API key is missing or too short" }

$values = [ordered]@{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) { continue }
  $parts = $line -split "=", 2
  if ($parts.Count -eq 2) { $values[$parts[0]] = $parts[1] }
}
$values["LLM_API_KEY"] = $apiKey
$values["LLM_PROVIDER"] = "openai"
$values["LLM_MODEL"] = "gpt-5.5"
$values["LLM_API_URL"] = "https://api.openai.com/v1/responses"
$values["LLM_TIMEOUT_MS"] = "20000"

$output = $values.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
[IO.File]::WriteAllLines((Resolve-Path -LiteralPath $envPath), $output, [Text.UTF8Encoding]::new($false))
Write-Host "OpenAI agent configuration saved to the ignored web environment file." -ForegroundColor Green
Write-Host "The key was not printed and will not be committed."
