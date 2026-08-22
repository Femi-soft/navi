param([switch]$UseDocumentedPublicFallback)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $repoRoot "apps\web\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "apps/web/.env.local is missing" }

if ($UseDocumentedPublicFallback) {
  $rpcUrl = "https://sepolia.base.org"
  $rpcSource = "BASE_DOCUMENTED_PUBLIC_FALLBACK"
} else {
  Write-Host "NAVI Base Sepolia authenticated RPC setup" -ForegroundColor Cyan
  Write-Host "Paste the Base Sepolia HTTP endpoint. It will remain hidden and will not be printed."
  $secureEndpoint = Read-Host "Base Sepolia HTTPS endpoint" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureEndpoint)
  try {
    $rpcUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  $rpcSource = "AUTHENTICATED_PROVIDER"
}

$parsed = $null
if (-not [Uri]::TryCreate($rpcUrl, [UriKind]::Absolute, [ref]$parsed) -or $parsed.Scheme -ne "https") {
  throw "Endpoint must be an absolute HTTPS URL"
}

$chainBody = @{ jsonrpc = "2.0"; method = "eth_chainId"; params = @(); id = 1 } | ConvertTo-Json -Compress
$chainResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $chainBody -TimeoutSec 20
if ($chainResponse.result -ne "0x14a34") {
  throw "Endpoint returned chain ID $($chainResponse.result); expected Base Sepolia 0x14a34"
}

$blockBody = @{ jsonrpc = "2.0"; method = "eth_blockNumber"; params = @(); id = 2 } | ConvertTo-Json -Compress
$blockResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $blockBody -TimeoutSec 20
if ($blockResponse.result -notmatch "^0x[0-9a-fA-F]+$") { throw "Endpoint did not return a valid latest block" }

$lines = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $envPath)
foreach ($entry in @{
  "BASE_SEPOLIA_RPC_URL" = $rpcUrl
  "BASE_SEPOLIA_RPC_SOURCE" = $rpcSource
}.GetEnumerator()) {
  $replacement = "$($entry.Key)=$($entry.Value)"
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index].StartsWith("$($entry.Key)=")) {
      $lines[$index] = $replacement
      $updated = $true
      break
    }
  }
  if (-not $updated) { $lines.Add($replacement) }
}
[System.IO.File]::WriteAllLines($envPath, $lines)

$blockNumber = [Convert]::ToUInt64($blockResponse.result.Substring(2), 16)
Write-Host "Configured Base Sepolia chain ID 84532 at latest block $blockNumber." -ForegroundColor Green
Write-Host "The endpoint and its provenance were stored only in the ignored apps/web/.env.local file."
