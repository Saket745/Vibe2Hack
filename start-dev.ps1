# Start the API Triage dev server in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx tsx dev-server.ts" -WorkingDirectory "c:\Users\mssak\Downloads\Vibe2Hack"

# Start the Vite dev server in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "c:\Users\mssak\Downloads\Vibe2Hack"

Write-Host "Both servers launched in separate powershell windows!"
