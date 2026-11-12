# Run ONCE in an administrator PowerShell on the laptop (not inside Ubuntu).
#   powershell -ExecutionPolicy Bypass -File install-autostart.ps1
# Registers a Windows scheduled task that starts Ubuntu (WSL2) at sign-in and keeps it running, so
# Docker (started by systemd inside Ubuntu) and the staging containers come back after a restart.
# For restarts with nobody signed in, also turn on automatic sign-in (see docs/runbook-staging.md).
param(
  [string]$Distro = "Ubuntu-24.04"
)

$taskName = "Sahtain staging - keep WSL running"
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d $Distro --exec /bin/sh -c 'while true; do sleep 3600; done'"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Principal $principal -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "Registered and started: $taskName"

# Never sleep while plugged in (the server must stay awake).
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host "Sleep on AC power disabled."
