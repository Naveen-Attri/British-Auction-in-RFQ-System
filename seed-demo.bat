@echo off
title Seed Demo Data

echo.
echo  Seeding demo RFQs with initial bids...
echo.

cd /d "%~dp0backend"
node seed.js

echo.
pause
