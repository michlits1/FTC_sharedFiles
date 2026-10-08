@echo off
javac *.java
if errorlevel 1 goto end
java Main
:end
pause
