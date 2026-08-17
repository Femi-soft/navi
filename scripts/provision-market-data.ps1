param(
  [string]$TestnetRpcUrl,
  [switch]$RpcOnly
)

$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\apps\web\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "apps/web/.env.local is missing" }

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$testnetRpcUrl = $TestnetRpcUrl.Trim()
if ([string]::IsNullOrWhiteSpace($testnetRpcUrl)) {
  $testnetRpcUrl = Read-Secret "Paste the X Layer TESTNET HTTPS endpoint (chain ID 1952)"
}
$rpcUri = [Uri]$testnetRpcUrl
if ($rpcUri.Scheme -ne "https") { throw "The X Layer testnet endpoint must use HTTPS" }

$isOfficialEndpoint =
  ($rpcUri.Host -eq "testrpc.xlayer.tech" -and $rpcUri.AbsolutePath.TrimEnd("/") -eq "/terigon") -or
  ($rpcUri.Host -eq "xlayertestrpc.okx.com" -and $rpcUri.AbsolutePath.TrimEnd("/") -eq "/terigon")
$isQuickNodeEndpoint = $rpcUri.Host.EndsWith(".quiknode.pro")
if (-not $isOfficialEndpoint -and -not $isQuickNodeEndpoint) {
  throw "Expected an official X Layer testnet endpoint or an X Layer QuickNode endpoint"
}

function Invoke-Rpc([string]$method, [object[]]$params) {
  $body = @{ jsonrpc = "2.0"; method = $method; params = $params; id = 1 } | ConvertTo-Json -Compress
  $response = Invoke-RestMethod -Uri $testnetRpcUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 15
  if ($response.error) { throw "RPC $method failed: $($response.error.message)" }
  return $response.result
}

$chainId = Invoke-Rpc "eth_chainId" @()
if ($chainId -ne "0x7a0") { throw "Expected X Layer testnet chain ID 1952 (0x7a0), received $chainId" }

$latestBlock = Invoke-Rpc "eth_getBlockByNumber" @("latest", $false)
$blockTimestamp = [Convert]::ToInt64($latestBlock.timestamp.Substring(2), 16)
$blockAgeSeconds = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::FromUnixTimeSeconds($blockTimestamp)).TotalSeconds
if ($blockAgeSeconds -lt -30 -or $blockAgeSeconds -gt 120) {
  throw "The X Layer testnet endpoint returned a stale or invalid latest block ($([Math]::Round($blockAgeSeconds)) seconds old)"
}

$values = [ordered]@{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) { continue }
  $parts = $line -split "=", 2
  if ($parts.Count -eq 2) { $values[$parts[0]] = $parts[1] }
}
$values["X_LAYER_TESTNET_RPC_URL"] = $testnetRpcUrl

if (-not $RpcOnly) {
  $tier = (Read-Host "CoinGecko tier (demo or pro)").Trim().ToLowerInvariant()
  if ($tier -notin @("demo", "pro")) { throw "CoinGecko tier must be demo or pro" }
  $priceKey = Read-Secret "Paste the CoinGecko API key"
  if ([string]::IsNullOrWhiteSpace($priceKey)) { throw "CoinGecko API key cannot be empty" }
  $priceHost = if ($tier -eq "pro") { "pro-api.coingecko.com" } else { "api.coingecko.com" }
  $values["PRICE_API_URL"] = "https://$priceHost/api/v3/simple/price?ids=okb&vs_currencies=usd&include_last_updated_at=true"
  $values["PRICE_API_KEY"] = $priceKey
  $values["PRICE_MAX_AGE_SECONDS"] = "180"
}

$output = $values.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
[IO.File]::WriteAllLines((Resolve-Path -LiteralPath $envPath), $output, [Text.UTF8Encoding]::new($false))
Write-Host "Verified X Layer testnet chain ID 1952 and a fresh latest block."
if ($RpcOnly) {
  Write-Host "NAVI X Layer testnet endpoint saved securely. You may close this window."
} else {
  Write-Host "NAVI X Layer testnet and price-provider credentials saved securely. You may close this window."
}
