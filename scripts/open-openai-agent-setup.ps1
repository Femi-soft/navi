$Host.UI.RawUI.WindowTitle = "NAVI OpenAI Agent Setup"

Write-Host "NAVI OpenAI agent setup" -ForegroundColor Cyan
Write-Host "Paste an OpenAI Platform API key when prompted."
Write-Host "The key remains hidden and will not be printed."
Write-Host ""

try {
  & (Join-Path $PSScriptRoot "provision-openai-agent.ps1")
} catch {
  Write-Host ""
  Write-Host ("Setup failed: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ""
[void](Read-Host "Press Enter to close this window")
