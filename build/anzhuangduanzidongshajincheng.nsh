!ifndef BUILD_UNINSTALLER
Function ForceKillBukongProcesses
  DetailPrint "正在尝试关闭旧版不空IP智能体进程..."
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference = 'SilentlyContinue'; $$target = '$INSTDIR'; $$selfExe = '$EXEPATH'; try { $$normalized = [System.IO.Path]::GetFullPath($$target).TrimEnd('\').ToLowerInvariant() } catch { $$normalized = $$target.Trim().TrimEnd('\').ToLowerInvariant() }; try { $$selfExeNorm = [System.IO.Path]::GetFullPath($$selfExe).Trim().ToLowerInvariant() } catch { $$selfExeNorm = $$selfExe.Trim().ToLowerInvariant() }; $$primaryKillNames = @('不空ip智能体.exe','crashpad_handler.exe','elevate.exe','un_a.exe','un_b.exe'); function Should-Stop($$proc) { $$nameLower = ([string]$$proc.Name).ToLowerInvariant(); $$exeLower = ([string]$$proc.ExecutablePath).ToLowerInvariant(); $$cmdLower = ([string]$$proc.CommandLine).ToLowerInvariant(); if ($$exeLower -and $$selfExeNorm -and $$exeLower -eq $$selfExeNorm) { return $$false }; if ($$nameLower -eq 'powershell.exe' -and $$cmdLower -and $$selfExeNorm -and $$cmdLower.Contains($$selfExeNorm)) { return $$false }; if ($$primaryKillNames -contains $$nameLower) { return $$true }; if ($$nameLower -match 'bukong|不空ip') { return $$true }; if ($$normalized -and (($$exeLower -and $$exeLower.StartsWith($$normalized)) -or ($$cmdLower -and $$cmdLower.Contains($$normalized)))) { return $$true }; return $$false }; function Stop-BukongTargets { try { $$targets = @(Get-CimInstance Win32_Process | Where-Object { Should-Stop $$_.psobject.BaseObject }); foreach ($$p in $$targets) { try { Stop-Process -Id ([int]$$p.ProcessId) -Force -ErrorAction SilentlyContinue } catch {} } } catch {}; foreach ($$name in $$primaryKillNames) { try { taskkill /f /t /im $$name | Out-Null } catch {} } }; for ($$i = 0; $$i -lt 18; $$i++) { Stop-BukongTargets; Start-Sleep -Milliseconds 450 }"` 
  Sleep 1600
FunctionEnd

!macro customInit
  Call ForceKillBukongProcesses
!macroend
!endif

!ifdef BUILD_UNINSTALLER
Function un.ForceKillBukongProcesses
  DetailPrint "正在尝试关闭旧版不空IP智能体进程..."
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference = 'SilentlyContinue'; $$target = '$INSTDIR'; $$selfExe = '$EXEPATH'; try { $$normalized = [System.IO.Path]::GetFullPath($$target).TrimEnd('\').ToLowerInvariant() } catch { $$normalized = $$target.Trim().TrimEnd('\').ToLowerInvariant() }; try { $$selfExeNorm = [System.IO.Path]::GetFullPath($$selfExe).Trim().ToLowerInvariant() } catch { $$selfExeNorm = $$selfExe.Trim().ToLowerInvariant() }; $$primaryKillNames = @('不空ip智能体.exe','crashpad_handler.exe','elevate.exe','un_a.exe','un_b.exe'); function Should-Stop($$proc) { $$nameLower = ([string]$$proc.Name).ToLowerInvariant(); $$exeLower = ([string]$$proc.ExecutablePath).ToLowerInvariant(); $$cmdLower = ([string]$$proc.CommandLine).ToLowerInvariant(); if ($$exeLower -and $$selfExeNorm -and $$exeLower -eq $$selfExeNorm) { return $$false }; if ($$nameLower -eq 'powershell.exe' -and $$cmdLower -and $$selfExeNorm -and $$cmdLower.Contains($$selfExeNorm)) { return $$false }; if ($$primaryKillNames -contains $$nameLower) { return $$true }; if ($$nameLower -match 'bukong|不空ip') { return $$true }; if ($$normalized -and (($$exeLower -and $$exeLower.StartsWith($$normalized)) -or ($$cmdLower -and $$cmdLower.Contains($$normalized)))) { return $$true }; return $$false }; function Stop-BukongTargets { try { $$targets = @(Get-CimInstance Win32_Process | Where-Object { Should-Stop $$_.psobject.BaseObject }); foreach ($$p in $$targets) { try { Stop-Process -Id ([int]$$p.ProcessId) -Force -ErrorAction SilentlyContinue } catch {} } } catch {}; foreach ($$name in $$primaryKillNames) { try { taskkill /f /t /im $$name | Out-Null } catch {} } }; for ($$i = 0; $$i -lt 18; $$i++) { Stop-BukongTargets; Start-Sleep -Milliseconds 450 }"` 
  Sleep 1600
FunctionEnd
!endif

!macro customCheckAppRunning
  StrCpy $R1 0
  kill_loop:
    !ifdef BUILD_UNINSTALLER
      Call un.ForceKillBukongProcesses
    !else
      Call ForceKillBukongProcesses
    !endif
    Sleep 1800
    ${nsProcess::FindProcess} "不空IP智能体.exe" $R0
    ${if} $R0 == 0
      IntOp $R1 $R1 + 1
      ${if} $R1 < 4
        Goto kill_loop
      ${endif}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY kill_loop
      Quit
    ${endIf}
!macroend

!macro customInstall
  !ifdef BUILD_UNINSTALLER
    Call un.ForceKillBukongProcesses
  !else
    Call ForceKillBukongProcesses
  !endif
  Sleep 1200
!macroend
