$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\apps\web\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "apps/web/.env.local is missing" }

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$apiKey = Read-Secret "Paste the Groq API key"
if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey.Length -lt 20) { throw "The Groq API key is missing or too short" }

$values = [ordered]@{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) { continue }
  $parts = $line -split "=", 2
  if ($parts.Count -eq 2) { $values[$parts[0]] = $parts[1] }
}
$values["LLM_PROVIDER"] = "groq"
$values["GROQ_API_KEY"] = $apiKey
$values["LLM_MODEL"] = "openai/gpt-oss-20b"
$values["LLM_API_URL"] = "https://api.groq.com/openai/v1/chat/completions"
$values["LLM_TIMEOUT_MS"] = "20000"

$output = $values.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
[IO.File]::WriteAllLines((Resolve-Path -LiteralPath $envPath), $output, [Text.UTF8Encoding]::new($false))
Write-Host "Groq testnet agent configuration saved to the ignored web environment file." -ForegroundColor Green
Write-Host "The key was not printed and will not be committed."
