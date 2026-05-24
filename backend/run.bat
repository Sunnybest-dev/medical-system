@echo off
echo ============================================
echo  Starting MediAI Backend
echo ============================================

cd /d %~dp0

if not exist venv\Scripts\activate.bat (
    echo ERROR: Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Starting Django development server on http://localhost:8000
echo Press Ctrl+C to stop

python manage.py runserver 0.0.0.0:8000
pause
