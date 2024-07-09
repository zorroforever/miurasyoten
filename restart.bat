@echo off
setlocal

REM 杀掉所有 Chrome 进程
taskkill /F /IM chrome.exe
echo Killed all Chrome processes.

REM 杀掉所有 Node.js 进程
taskkill /F /IM node.exe
echo Killed all Node processes.

REM 等待几秒钟确保进程被杀掉
timeout /T 2 /NOBREAK > nul

REM 启动 Puppeteer.js 脚本
node puppeteer-script.js

REM 延迟一段时间观察效果
timeout /T 5 /NOBREAK > nul

endlocal
exit /B 0
