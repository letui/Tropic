@echo off
for /f %%i in (app.pid) do (
taskkill /f /pid %%i
)