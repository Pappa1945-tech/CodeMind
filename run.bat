@echo off
title CodeMind Launcher
cd /d "%~dp0"

:: 1. Check and validate .venv
if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo [CodeMind Launcher] Using virtual environment (.venv)
        set PYTHON_CMD=.venv\Scripts\python.exe
        goto run
    ) else (
        echo [CodeMind Launcher] Warning: Found .venv/ but it is broken or missing its base Python DLL. Skipping...
    )
)

:: 2. Check and validate venv
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        echo [CodeMind Launcher] Using virtual environment (venv)
        set PYTHON_CMD=venv\Scripts\python.exe
        goto run
    ) else (
        echo [CodeMind Launcher] Warning: Found venv/ but it is broken or missing its base Python DLL. Skipping...
    )
)

:: 3. Check system python command
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [CodeMind Launcher] Using system Python
    set PYTHON_CMD=python
    goto run
)

:: 4. Check py launcher (installed to C:\Windows by default)
py --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [CodeMind Launcher] Using Python Launcher (py)
    set PYTHON_CMD=py
    goto run
)

:: 5. Search standard installation directories
echo [CodeMind Launcher] System 'python' command not found. Searching default paths...
for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
    if exist "%%d\python.exe" (
        echo [CodeMind Launcher] Found Python in %%d
        set PYTHON_CMD="%%d\python.exe"
        goto run
    )
)
for /d %%d in ("%ProgramFiles%\Python*") do (
    if exist "%%d\python.exe" (
        echo [CodeMind Launcher] Found Python in %%d
        set PYTHON_CMD="%%d\python.exe"
        goto run
    )
)

echo [Error] Python was not found in PATH or standard installation folders.
echo Please ensure Python is installed and added to PATH, or recreate your virtual environment.
pause
exit /b 1

:run
%PYTHON_CMD% launcher.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo [Error] launcher.py exited with error code %ERRORLEVEL%
    pause
)
