#!/usr/bin/bash

# A script for building and running the container

quit_gracefully() {
    echo "Exitting gracefully"
    rm -f uuid-*.tgz ws-*.tgz
}

# Check that arguments exist
if [ $# -eq 0 ]; then
    echo "Requires at least one argument: the socket path" 1>&2
    echo "May also provide the problem directory path" 1>&2
    exit 1
fi

if [ ! -S "$1" ]; then
    echo "Socket does not exist" 1>&2
    exit 1
fi
    
if [ $# -ge 2 ] && [ ! -d "$2" ]; then
    echo "Problem directory doest not exist" 1>&2
    exit 1
fi

trap quit_gracefully SIGINT SIGTERM

echo "Beginning image building"

# Pack the neccessary node packages into tarballs (.tgz)
npm pack uuid ws 

# Build the image with arguments and execute in container
podman build --build-arg EXER_SOCKET=/app/socket/${1##*/} . -t executioner

echo "Running container"

if [ $# -ge 2 ]; then
    podman run -itv "${1%/*}":/app/socket -v "$2":/app/problem executioner 
else
    podman run -itv "${1%/*}":/app/socket executioner
fi

# Clean up
quit_gracefully
