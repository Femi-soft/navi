$Host.UI.RawUI.WindowTitle = "NAVI Groq Agent Setup"

Write-Host "NAVI Groq testnet agent setup" -ForegroundColor Cyan
Write-Host "Paste a Groq project API key when prompted."
Write-Host "The key remains hidden and will not be printed."
Write-Host ""

try {
  & (Join-Path $PSScriptRoot "provision-groq-agent.ps1")
} catch {
  Write-Host ""
  Write-Host ("Setup failed: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ""
[void](Read-Host "Press Enter to close this window")
