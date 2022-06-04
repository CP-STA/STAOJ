#!/usr/bin/bash

# Quit start up script

quit_gracefully() {
    echo "Exitting gracefully"
    rm -rf demoter.c Makefile demoter.out
}

if [ $# -lt 2 ]; then
    echo "Requires at least two arguments: the socket path and repo_path" 1>&2
    exit 1
fi

if [ ! -S "$1" ]; then
    echo "Socket does not exist" 1>&2
    exit 1
fi
    
trap quit_gracefully SIGINT SIGTERM

# Pack the neccessary node packages into tarballs (.tgz)

# Retrieve the demoter program and build
cp ../tools/measurer/demoter.c ../tools/measurer/Makefile .
make

npm install
EXER_SOCKET=$1 REPO_PATH=$2 node executioner.mjs

quit_gracefully
