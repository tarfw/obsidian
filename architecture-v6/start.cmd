@echo off
title TAR v6 - architecture site
cd /d "%~dp0"

echo.
echo   TAR v6 - Architecture Site
echo   --------------------------
echo.

if not exist node_modules (
  echo   First run detected - installing dependencies. This may take a minute...
  echo.
  call npm install
)

echo   Starting the site. A browser tab will open at http://localhost:4321
echo.
echo   Keep THIS window open while you look around.
echo   Press Ctrl+C here when you are done.
echo.

call npm run dev -- --open
pause
