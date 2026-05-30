!macro customInit
  ; Safe Mode: Removed automatic process killing to prevent installer issues.
  DetailPrint "Iniciando instalador..."

  ; ONLY kill the main app process if found, NOT the installer itself
  nsExec::Exec 'cmd /c taskkill /F /IM "pcshogar.exe" /T /FI "STATUS eq RUNNING" || exit 0'
  
  ; Give some time for the process to release file locks
  Sleep 1000

  ; Force remove the resources folder to prevent locking issues (Requested by user)
  RMDir /r "$INSTDIR\resources"
!macroend

!macro customUnInit
  ; Safe Mode: Removed automatic process killing.
!macroend
