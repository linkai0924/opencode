@echo off
setlocal enabledelayedexpansion

set "BASE_URL=https://zgsm.sangfor.com"
if not "%COSTRICT_BASE_URL%"=="" (
    set "BASE_URL=%COSTRICT_BASE_URL%"
)

:usage
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-v" goto :check_version_arg
if "%~1"=="--version" goto :check_version_arg
if "%~1"=="-b" goto :check_binary_arg
if "%~1"=="--binary" goto :check_binary_arg
goto :main

:show_help
echo.
echo CoStrict Installer for Windows
echo.
echo Usage: install.bat [options]
echo.
echo Options:
echo     -h, --help              Display this help message
echo     -v, --version ^<version^> Install a specific version (e.g. 1.0.180)
echo     -b, --binary ^<path^>     Install from a local binary instead of downloading
echo.
echo Environment Variables:
echo     COSTRICT_BASE_URL       Base URL for downloading (default: https://zgsm.sangfor.com)
echo.
echo Examples:
echo     install.bat -v 1.0.180
echo     COSTRICT_BASE_URL=https://custom.com install.bat -v 1.0.180
echo     install.bat -b C:\path\to\costrict-cli.exe
echo.
exit /b 0

:check_version_arg
if "%~2"=="" (
    echo Error: --version requires a version argument
    exit /b 1
)
set "REQUESTED_VERSION=%~2"
shift
shift
if not "%~1"=="" goto :parse_args
goto :main

:check_binary_arg
if "%~2"=="" (
    echo Error: --binary requires a path argument
    exit /b 1
)
set "BINARY_PATH=%~2"
goto :main

:parse_args
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-v" goto :check_version_arg
if "%~1"=="--version" goto :check_version_arg
if "%~1"=="-b" goto :check_binary_arg
if "%~1"=="--binary" goto :check_binary_arg
echo Warning: Unknown option '%~1'
shift
goto :parse_args

:main
set "INSTALL_DIR=%USERPROFILE%\.costrict\bin"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if not "%BINARY_PATH%"=="" (
    if not exist "%BINARY_PATH%" (
        echo Error: Binary not found at %BINARY_PATH%
        exit /b 1
    )
    echo Installing costrict-cli from: %BINARY_PATH%
    copy /Y "%BINARY_PATH%" "%INSTALL_DIR%\costrict-cli.exe" >nul
    if errorlevel 1 (
        echo Error: Failed to copy binary
        exit /b 1
    )
    echo [OK] Installed successfully
    goto :add_to_path
)

if "%REQUESTED_VERSION%"=="" (
    echo Error: --version is required (e.g., 1.0.180)
    exit /b 1
)

:: Remove leading 'v' if present
if "%REQUESTED_VERSION:~0,1%"=="v" (
    set "REQUESTED_VERSION=%REQUESTED_VERSION:~1%"
)

:: Detect CPU architecture
set "ARCH=x64"

:: Check if we can detect AVX2 support
set "TARGET=opencode-windows-%ARCH%"
reg query "HKEY_LOCAL_MACHINE\HARDWARE\DESCRIPTION\System\CentralProcessor\0" /v "FeatureSet" >nul 2>&1
if errorlevel 1 (
    :: If FeatureSet check fails, assume baseline
    set "TARGET=opencode-windows-%ARCH%-baseline"
) else (
    :: Try to detect AVX2 support via CPUID
    :: This is a simplified check - may not work on all systems
    wmic cpu get Name | findstr /i "AMD" >nul 2>&1
    if errorlevel 1 (
        :: Not AMD, check Intel
        wmic cpu get Name | findstr /i "Intel" >nul 2>&1
        if errorlevel 1 (
            :: Unknown CPU, use baseline
            set "TARGET=opencode-windows-%ARCH%-baseline"
        )
    )
)

set "ARCHIVE_EXT=.zip"
set "DOWNLOAD_URL=%BASE_URL%/costrict/pkg/%REQUESTED_VERSION%/%TARGET%%ARCHIVE_EXT%"

echo.
echo Downloading costrict-cli version: %REQUESTED_VERSION%
echo Target: %TARGET%
echo URL: %DOWNLOAD_URL%
echo.

set "TEMP_DIR=%TEMP%\costrict-cli-%RANDOM%"
mkdir "%TEMP_DIR%"
set "ARCHIVE_PATH=%TEMP_DIR%\%TARGET%%ARCHIVE_EXT%"

:: Download using PowerShell
powershell -Command "try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ARCHIVE_PATH%' -UseBasicParsing; exit 0 } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo Error: Download failed
    rmdir /S /Q "%TEMP_DIR%" 2>nul
    exit /b 1
)

if not exist "%ARCHIVE_PATH%" (
    echo Error: Download failed - file not created
    rmdir /S /Q "%TEMP_DIR%" 2>nul
    exit /b 1
)

:: Check if file has content
for %%A in ("%ARCHIVE_PATH%") do set FILE_SIZE=%%~zA
if %FILE_SIZE% LSS 1024 (
    echo Error: Downloaded file is too small (%FILE_SIZE% bytes)
    rmdir /S /Q "%TEMP_DIR%"
    exit /b 1
)

echo Extracting archive...
powershell -Command "try { Expand-Archive -Path '%ARCHIVE_PATH%' -DestinationPath '%TEMP_DIR%' -Force; exit 0 } catch { Write-Host 'Extract failed:' $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo Error: Failed to extract archive
    rmdir /S /Q "%TEMP_DIR%"
    exit /b 1
)

set "BINARY_SOURCE=%TEMP_DIR%\bin\costrict-cli.exe"
if not exist "%BINARY_SOURCE%" (
    echo Error: Binary not found in extracted archive
    rmdir /S /Q "%TEMP_DIR%"
    exit /b 1
)

move /Y "%BINARY_SOURCE%" "%INSTALL_DIR%\costrict-cli.exe" >nul
if errorlevel 1 (
    echo Error: Failed to move file to %INSTALL_DIR%
    rmdir /S /Q "%TEMP_DIR%"
    exit /b 1
)

rmdir /S /Q "%TEMP_DIR%"

echo [OK] Installed successfully to: %INSTALL_DIR%\costrict-cli.exe

:add_to_path
:: Check if INSTALL_DIR is already in PATH
echo %PATH% | findstr /i "%INSTALL_DIR%" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [OK] PATH already configured
    goto :install_base_url
)

:: Detect PowerShell profile location
set "PROFILE_FILE="
if exist "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" (
    set "PROFILE_FILE=%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
) else if exist "%USERPROFILE%\Documents\WindowsPowerShell\profile.ps1" (
    set "%PROFILE_FILE=%USERPROFILE%\Documents\WindowsPowerShell\profile.ps1"
)

if "%PROFILE_FILE%"=="" (
    echo.
    echo No PowerShell profile found. You may need to manually add to PATH:
    echo   $env:PATH += ";%INSTALL_DIR%"
) else (
    :: Check if PATH already configured in profile
    findstr /i "costrict" "%PROFILE_FILE%" >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo PATH already configured in %PROFILE_FILE%
    ) else (
        :: Add PATH to profile
        echo. >> "%PROFILE_FILE%"
        echo # costrict >> "%PROFILE_FILE%"
        echo $env:PATH += ";%INSTALL_DIR%" >> "%PROFILE_FILE%"
        echo.
        echo [OK] Added costrict to PATH in %PROFILE_FILE%
        echo Please restart your shell or run: . %PROFILE_FILE%
    )
)

:install_base_url
:: Add COSTRICT_BASE_URL to system environment variables (user level)
if not "%COSTRICT_BASE_URL%"=="" (
    echo.
    echo Setting COSTRICT_BASE_URL environment variable...
    
    :: Use setx to add to user environment variables
    setx COSTRICT_BASE_URL "%COSTRICT_BASE_URL%" >nul
    
    if errorlevel 1 (
        echo Warning: Failed to set COSTRICT_BASE_URL permanently
        echo You may need to set it manually:
        echo   setx COSTRICT_BASE_URL "%COSTRICT_BASE_URL%"
    ) else (
        echo [OK] Added COSTRICT_BASE_URL to user environment variables
        echo Please restart your terminal for the change to take effect
    )
)

echo.
echo ╔════════════════════════════════════════╗
echo ║       CoStrict CLI Installation Complete  ║
echo ╚════════════════════════════════════════╝
echo.
echo To start:
echo.
echo   cd ^<project^>    # Open directory
echo   costrict-cli       # Run command
echo.
echo For more information visit https://costrict.ai/docs
echo.

exit /b 0
