@echo on
echo ==========================================
echo Starting Community Hero Dev Servers
echo ==========================================
echo.

echo Starting API Triage server on port 3000...
start cmd /k "npx tsx dev-server.ts"

echo Starting Vite frontend dev server on port 5173...
start cmd /k "npm run dev"

echo.
echo Dev servers started. You can close this window.
echo.
pause
