@echo off
@setlocal enableextensions enabledelayedexpansion
@set classpath=.
@for %%c in (./lib/*.jar) do @set classpath=!classpath!;./lib/%%c
@set classpath=%classpath%;
jrunscript -encoding utf-8 -cp %classpath%;./log/ -Dnashorn.args=--language=es6 -f app.js