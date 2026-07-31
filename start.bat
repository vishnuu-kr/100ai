@echo off
echo.
echo  ██████████████████████████████████████
echo   AI COMPANY - 100 Agent Dashboard
echo  ██████████████████████████████████████
echo.
echo  Starting backend server...
start "AI Company Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
echo  Backend starting on http://localhost:8000
echo.
timeout /t 3 /nobreak >nul
echo  Starting frontend dashboard...
start "AI Company Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo  Frontend starting on http://localhost:3000
echo.
timeout /t 5 /nobreak >nul
echo  Opening dashboard in browser...
start http://localhost:3000
echo.
echo  Both servers are running!
echo  Press any key to exit this window (servers will keep running)
pause >nul
