param(
  [switch]$AcknowledgeUnauditedTestnetOnly,
  [switch]$AcknowledgePublicFallback
)

$ErrorActionPreference = "Stop"
if (-not $AcknowledgeUnauditedTestnetOnly) { throw "Pass -AcknowledgeUnauditedTestnetOnly for this paused, unapproved Base Sepolia canary deployment" }

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
$evidenceSigner = $values["BASE_SEPOLIA_SIMULATION_SIGNER_ADDRESS"]
$evidenceSignerPrivateKey = $values["BASE_SEPOLIA_SIMULATION_SIGNER_PRIVATE_KEY"]
if ([string]::IsNullOrWhiteSpace($rpcUrl)) { throw "BASE_SEPOLIA_RPC_URL is not configured" }
if ($privateKey -notmatch "^0x[0-9a-fA-F]{64}$") { throw "BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY must be a dedicated testnet key" }
if ($evidenceSigner -notmatch "^0x[0-9a-fA-F]{40}$") { throw "BASE_SEPOLIA_SIMULATION_SIGNER_ADDRESS is not configured" }
if ($evidenceSignerPrivateKey -notmatch "^0x[0-9a-fA-F]{64}$") { throw "BASE_SEPOLIA_SIMULATION_SIGNER_PRIVATE_KEY must be a separate testnet key" }
if ($rpcSource -eq "BASE_DOCUMENTED_PUBLIC_FALLBACK" -and -not $AcknowledgePublicFallback) { throw "Pass -AcknowledgePublicFallback for the Base-documented public testnet fallback" }

$previousDerivationKey = $env:NAVI_PRIVATE_KEY_TO_DERIVE
try {
  $deriveAddress = 'import { privateKeyToAccount } from "viem/accounts"; console.log(privateKeyToAccount(process.env.NAVI_PRIVATE_KEY_TO_DERIVE).address)'
  $env:NAVI_PRIVATE_KEY_TO_DERIVE = $privateKey
  $deployerAddress = (& node --input-type=module -e $deriveAddress).Trim()
  $env:NAVI_PRIVATE_KEY_TO_DERIVE = $evidenceSignerPrivateKey
  $derivedEvidenceSigner = (& node --input-type=module -e $deriveAddress).Trim()
} finally {
  $env:NAVI_PRIVATE_KEY_TO_DERIVE = $previousDerivationKey
}
if ($derivedEvidenceSigner -ne $evidenceSigner) { throw "BASE_SEPOLIA_SIMULATION_SIGNER_ADDRESS does not match its private key" }
if ($derivedEvidenceSigner -eq $deployerAddress) { throw "Refusing deployment: evidence signer must be distinct from the deployer" }

$rpcBody = @{ jsonrpc = "2.0"; method = "eth_chainId"; params = @(); id = 1 } | ConvertTo-Json -Compress
$rpcResponse = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType "application/json" -Body $rpcBody -TimeoutSec 15
if ($rpcResponse.result -ne "0x14a34") { throw "Refusing deployment: RPC is not Base Sepolia chain ID 84532" }

$parameterPath = Join-Path $repoRoot ".base-sepolia-canary-parameters.json"
$parameters = @{ NaviBaseSepoliaCanaryModule = @{ evidenceSigner = $evidenceSigner } } | ConvertTo-Json -Depth 4
$previousRpc = $env:BASE_SEPOLIA_RPC_URL
$previousKey = $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY
$previousConfirmation = $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT
try {
  [IO.File]::WriteAllText($parameterPath, $parameters, [Text.UTF8Encoding]::new($false))
  $env:BASE_SEPOLIA_RPC_URL = $rpcUrl
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $privateKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "acknowledged-unaudited-testnet-only"
  $hardhat = Join-Path $repoRoot "node_modules\.bin\hardhat.cmd"
  & $hardhat ignition deploy ignition/modules/NaviBaseSepoliaCanary.ts --network baseSepolia --parameters $parameterPath --deployment-id base-sepolia-canary-v3
  if ($LASTEXITCODE -ne 0) { throw "Hardhat Ignition canary deployment failed with exit code $LASTEXITCODE" }
} finally {
  Remove-Item -LiteralPath $parameterPath -Force -ErrorAction SilentlyContinue
  $env:BASE_SEPOLIA_RPC_URL = $previousRpc
  $env:BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY = $previousKey
  $env:HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = $previousConfirmation
}
