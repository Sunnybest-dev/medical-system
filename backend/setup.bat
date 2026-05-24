@echo off
echo ============================================
echo  MediAI Backend Setup Script
echo ============================================

echo.
echo [1/4] Creating virtual environment with Python 3.11...
py -3.11 -m venv venv
if errorlevel 1 (
    echo ERROR: Python 3.11 not found. Please install from python.org
    pause
    exit /b 1
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Running database migrations...
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Migration failed. Is PostgreSQL running?
    pause
    exit /b 1
)

echo.
echo [OPTIONAL] Creating admin superuser...
python manage.py createsuperuser

echo.
echo [OPTIONAL] Loading initial symptoms data...
python manage.py seed_symptoms

echo.
echo ============================================
echo  Setup complete!
echo  Run: venv\Scripts\activate then: python manage.py runserver
echo ============================================
pause
