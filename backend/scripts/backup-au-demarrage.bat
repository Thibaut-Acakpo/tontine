@echo off
REM Attendre que WAMP soit démarré (30 secondes)
timeout /t 30 /nobreak >nul

cd /d C:\wamp64\www\tontine\backend
node scripts\backup-local.js >> logs\backup.log 2>&1