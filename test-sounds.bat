@echo off
echo Tars Notify - Windows Sound Test
echo ===================================
echo.

REM Check if running from WSL path
if exist "%~dp0sounds\ping.wav" (
    set SOUNDS_DIR=%~dp0sounds
) else (
    set SOUNDS_DIR=%USERPROFILE%\tars-notify\sounds
)

echo Testing sounds from: %SOUNDS_DIR%
echo.

echo [1/4] Playing PING...
powershell -c "(New-Object Media.SoundPlayer '%SOUNDS_DIR%\ping.wav').PlaySync()" 2>nul || echo    (Could not play - file may not exist)
timeout /t 1 /nobreak >nul

echo [2/4] Playing SUCCESS...
powershell -c "(New-Object Media.SoundPlayer '%SOUNDS_DIR%\success.wav').PlaySync()" 2>nul || echo    (Could not play - file may not exist)
timeout /t 1 /nobreak >nul

echo [3/4] Playing COMPLETE...
powershell -c "(New-Object Media.SoundPlayer '%SOUNDS_DIR%\complete.wav').PlaySync()" 2>nul || echo    (Could not play - file may not exist)
timeout /t 1 /nobreak >nul

echo [4/4] Playing ERROR...
powershell -c "(New-Object Media.SoundPlayer '%SOUNDS_DIR%\error.wav').PlaySync()" 2>nul || echo    (Could not play - file may not exist)

echo.
echo ===================================
echo Test complete!
pause
