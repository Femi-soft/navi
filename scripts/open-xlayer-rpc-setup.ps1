$Host.UI.RawUI.WindowTitle = "NAVI QuickNode X Layer Testnet Setup"

Write-Host "NAVI QuickNode X Layer Testnet RPC setup" -ForegroundColor Cyan
Write-Host "Paste the QuickNode X Layer testnet HTTP endpoint when prompted."
Write-Host "The endpoint will remain hidden and will not be printed."
Write-Host ""

try {
    & (Join-Path $PSScriptRoot "provision-market-data.ps1") -RpcOnly
} catch {
    Write-Host ""
    Write-Host ("Setup failed: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ""
[void](Read-Host "Press Enter to close this window")
