@echo off
echo Setting up Android Emulator connection for Mosque Translation App
echo.

echo Step 1: Finding ADB...
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo ADB not found in PATH. Trying common Android SDK locations...
    
    set "ADB_PATH="
    if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
        set "ADB_PATH=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    ) else if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
        set "ADB_PATH=C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    ) else if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
        set "ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe"
    ) else (
        echo ERROR: ADB not found. Please install Android SDK or add ADB to PATH.
        echo.
        echo Alternative solutions:
        echo 1. Temporarily disable Windows Firewall
        echo 2. Add firewall exception for port 8080
        echo 3. Use your actual IP address: 10.0.129.101:8080
        pause
        exit /b 1
    )
    
    echo Found ADB at: %ADB_PATH%
    set "ADB=%ADB_PATH%"
) else (
    set "ADB=adb"
    echo ADB found in PATH
)

echo.
echo Step 2: Checking Android device/emulator...
%ADB% devices
if %errorlevel% neq 0 (
    echo ERROR: Failed to list devices. Make sure Android emulator is running.
    pause
    exit /b 1
)

echo.
echo Step 3: Setting up port forwarding...
echo Forwarding Android localhost:8080 to host machine port 8080...
%ADB% reverse tcp:8080 tcp:8080
if %errorlevel% equ 0 (
    echo SUCCESS: Port forwarding established!
    echo.
    echo Your React Native app should now be able to connect to:
    echo http://localhost:8080/api
    echo.
    echo You can now try logging in to your app.
) else (
    echo ERROR: Failed to set up port forwarding.
    echo.
    echo Alternative solutions:
    echo 1. Temporarily disable Windows Firewall
    echo 2. Add firewall exception for port 8080
    echo 3. Change Android config to use: http://10.0.129.101:8080/api
)

echo.
echo Press any key to exit...
pause >nul
