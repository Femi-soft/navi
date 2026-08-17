param([switch]$AcknowledgeTestnetOnly)

$ErrorActionPreference = "Stop"

if (-not $AcknowledgeTestnetOnly) {
  throw "Pass -AcknowledgeTestnetOnly after confirming this is an unaudited X Layer testnet deployment"
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

$rpcUrl = $values["X_LAYER_TESTNET_RPC_URL"]
$privateKey = $values["DEPLOYER_PRIVATE_KEY"]
if ([string]::IsNullOrWhiteSpace($rpcUrl)) { throw "X_LAYER_TESTNET_RPC_URL is not configured" }
if ($privateKey -notmatch "^0x[0-9a-fA-F]{64}$") { throw "DEPLOYER_PRIVATE_KEY must be a dedicated 32-byte testnet key" }

$rpcBody = @{ jsonrpc = "2.0"; method = "eth_chainId"; params = @(); id = 1 } | ConvertTo-Json -Compress
$rpcResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $rpcBody -TimeoutSec 15
if ($rpcResponse.result -ne "0x7a0") { throw "Refusing deployment: RPC is not X Layer testnet chain ID 1952" }

$previousRpc = $env:X_LAYER_TESTNET_RPC_URL
$previousKey = $env:DEPLOYER_PRIVATE_KEY
$previousIgnitionConfirmation = $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT
try {
  $env:X_LAYER_TESTNET_RPC_URL = $rpcUrl
  $env:DEPLOYER_PRIVATE_KEY = $privateKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "acknowledged-testnet-only"
  $hardhat = Join-Path $repoRoot "node_modules\.bin\hardhat.cmd"
  if (-not (Test-Path -LiteralPath $hardhat)) { throw "Hardhat is not installed" }
  & $hardhat ignition deploy ignition/modules/Navi.ts --network xlayerTestnet
  if ($LASTEXITCODE -ne 0) { throw "Hardhat Ignition deployment failed with exit code $LASTEXITCODE" }
} finally {
  $env:X_LAYER_TESTNET_RPC_URL = $previousRpc
  $env:DEPLOYER_PRIVATE_KEY = $previousKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = $previousIgnitionConfirmation
}
