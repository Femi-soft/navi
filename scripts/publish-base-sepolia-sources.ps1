param([switch]$AcknowledgeTestnetOnly)

$ErrorActionPreference = "Stop"

if (-not $AcknowledgeTestnetOnly) {
  throw "Pass -AcknowledgeTestnetOnly to publish the Base Sepolia deployment sources"
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
$privateKey = $values["BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY"]
if ([string]::IsNullOrWhiteSpace($rpcUrl)) { throw "BASE_SEPOLIA_RPC_URL is not configured" }
if ($privateKey -notmatch "^0x[0-9a-fA-F]{64}$") {
  throw "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY must be a dedicated 32-byte testnet key"
}

$rpcBody = @{ jsonrpc = "2.0"; method = "eth_chainId"; params = @(); id = 1 } | ConvertTo-Json -Compress
$rpcResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $rpcBody -TimeoutSec 15
if ($rpcResponse.result -ne "0x14a34") {
  throw "Refusing source publication: RPC is not Base Sepolia chain ID 84532"
}

$deploymentId = "chain-84532"
$deploymentPath = Join-Path $repoRoot "ignition\deployments\$deploymentId"
if (-not (Test-Path -LiteralPath $deploymentPath)) {
  throw "Ignition deployment metadata is missing for $deploymentId"
}

$previousRpc = $env:BASE_SEPOLIA_RPC_URL
$previousKey = $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY
try {
  $env:BASE_SEPOLIA_RPC_URL = $rpcUrl
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $privateKey
  $hardhat = Join-Path $repoRoot "node_modules\.bin\hardhat.cmd"
  if (-not (Test-Path -LiteralPath $hardhat)) { throw "Hardhat is not installed" }
  & $hardhat ignition verify $deploymentId --network baseSepolia
  if ($LASTEXITCODE -ne 0) { throw "Hardhat Ignition source verification failed with exit code $LASTEXITCODE" }
} finally {
  $env:BASE_SEPOLIA_RPC_URL = $previousRpc
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $previousKey
}
