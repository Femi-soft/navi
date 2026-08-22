param(
  [switch]$AcknowledgeTestnetOnly,
  [switch]$AcknowledgePublicFallback
)

$ErrorActionPreference = "Stop"

if (-not $AcknowledgeTestnetOnly) {
  throw "Pass -AcknowledgeTestnetOnly after confirming this is an unaudited Base Sepolia deployment"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $repoRoot "apps\web\.env.local"
if (-not (Test-Path -LiteralPath $envPath)) { throw "apps/web/.env.local is missing" }

$values = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) { continue }
  $parts = $line -split "=", 2
  if ($parts.Count -eq 2) { $values[$parts[0]] = $parts[1] }
}

$rpcUrl = $values["BASE_SEPOLIA_RPC_URL"]
$rpcSource = $values["BASE_SEPOLIA_RPC_SOURCE"]
$privateKey = $values["BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY"]
if ([string]::IsNullOrWhiteSpace($rpcUrl)) { throw "BASE_SEPOLIA_RPC_URL is not configured" }
if ($privateKey -notmatch "^0x[0-9a-fA-F]{64}$") {
  throw "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY must be a dedicated 32-byte testnet key"
}
if ($rpcSource -eq "BASE_DOCUMENTED_PUBLIC_FALLBACK" -and -not $AcknowledgePublicFallback) {
  throw "Pass -AcknowledgePublicFallback to deploy through the Base-documented public testnet fallback"
}

$rpcBody = @{ jsonrpc = "2.0"; method = "eth_chainId"; params = @(); id = 1 } | ConvertTo-Json -Compress
$rpcResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $rpcBody -TimeoutSec 15
if ($rpcResponse.result -ne "0x14a34") {
  throw "Refusing deployment: RPC is not Base Sepolia chain ID 84532"
}

$previousRpc = $env:BASE_SEPOLIA_RPC_URL
$previousKey = $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY
$previousIgnitionConfirmation = $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT
try {
  $env:BASE_SEPOLIA_RPC_URL = $rpcUrl
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $privateKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "acknowledged-testnet-only"
  $hardhat = Join-Path $repoRoot "node_modules\.bin\hardhat.cmd"
  if (-not (Test-Path -LiteralPath $hardhat)) { throw "Hardhat is not installed" }
  & $hardhat ignition deploy ignition/modules/NaviBaseSepolia.ts --network baseSepolia
  if ($LASTEXITCODE -ne 0) { throw "Hardhat Ignition deployment failed with exit code $LASTEXITCODE" }
} finally {
  $env:BASE_SEPOLIA_RPC_URL = $previousRpc
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $previousKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = $previousIgnitionConfirmation
}
