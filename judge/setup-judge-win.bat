@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   🎯 Pepper Judge Setup for Windows
echo ========================================
echo.

:: Check if Python is installed
echo 📋 Checking prerequisites...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python is not installed or not in PATH
        echo Please install Python 3.8+ from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo ✅ All prerequisites found!
echo.

:: Create directory
echo 📁 Creating pepper-judge directory...
if not exist "pepper-judge" mkdir pepper-judge
cd pepper-judge

:: Download files
echo 📥 Downloading judge files...
echo Downloading main.py...
curl -s -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/main.py
if %errorlevel% neq 0 (
    echo ❌ Failed to download main.py
    echo Please check your internet connection
    pause
    exit /b 1
)

echo Downloading requirements.txt...
curl -s -O https://raw.githubusercontent.com/Diwakar-Gupta/pepper/main/judge/requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to download requirements.txt
    echo Please check your internet connection
    pause
    exit /b 1
)

echo ✅ Files downloaded successfully!
echo.

:: Create virtual environment
echo 🐍 Creating Python virtual environment...
%PYTHON_CMD% -m venv venv
if %errorlevel% neq 0 (
    echo ❌ Failed to create virtual environment
    pause
    exit /b 1
)

:: Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

:: Upgrade pip
echo 📦 Upgrading pip...
python -m pip install --upgrade pip --quiet

:: Install dependencies
echo 📦 Installing dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Try running: pip install -r requirements.txt
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo.

:: Create run script
echo 📝 Creating run script...
echo @echo off > run-judge.bat
echo call venv\Scripts\activate.bat >> run-judge.bat
echo python main.py >> run-judge.bat
echo pause >> run-judge.bat

echo.
echo ========================================
echo   🎉 Setup Complete!
echo ========================================
echo.
echo To start the Pepper Judge:
echo   1. Double-click 'run-judge.bat' OR
echo   2. Run: python main.py
echo.
echo 📋 Next steps:
echo   1. Run the judge server
echo   2. Copy the 8-character judge code displayed
echo   3. Enter this code in the Pepper web application
echo.
echo 🔧 Troubleshooting:
echo   - If you get errors, check the console output
echo   - Make sure all prerequisites are properly installed
echo   - Visit: https://github.com/Diwakar-Gupta/pepper/issues
echo.

:: Ask if user wants to start the judge now
set /p start_now="🚀 Would you like to start the judge now? (y/n): "
if /i "%start_now%"=="y" (
    echo.
    echo Starting Pepper Judge...
    python main.py
) else (
    echo.
    echo You can start the judge later by running 'run-judge.bat'
)

pause
