#!/bin/bash
export cpPath=`ls ./lib/*.jar | xargs echo | sed 's/ /:/g'`
export cpPath=$cpPath:./log/
echo $cpPath
jrunscript -encoding utf-8 -classpath $cpPath -Dnashorn.args=--language=es6 -f app.js
