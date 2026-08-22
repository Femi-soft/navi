$Host.UI.RawUI.WindowTitle = "NAVI Base Sepolia RPC Setup"

try {
  & (Join-Path $PSScriptRoot "provision-base-sepolia-rpc.ps1")
} catch {
  Write-Host ""
  Write-Host ("Setup failed: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ""
[void](Read-Host "Press Enter to close this window")
