#!/bin/bash
export cpPath=`ls ./lib/*.jar | xargs echo | sed 's/ /:/g'`
export cpPath=$cpPath:./log/
jrunscript -encoding utf-8 -classpath $cpPath -f app.js