#!/usr/bin/bash

# The script compiles a file given the correct arguments
# It is intended to be run within the contianer
# This is to ensure that, if required, the language is compiled for the correct envrionment
# The demoter script is also built here to prevent rebuilding it on every test case

# Script requires 3 arguments
# 1. source code file name
# 2. source code language
# 3. name of compiled code file

# If no arguments passed, then just compile demoter


# Holds the compile methods for the different languages
# Arguments are the same as the script
compile() {
  case "$2" in 
    "gcc@11.3")
      g++ "$1" -o "$3"
      ;;
    "java@11.0")
      javac "$1"
      ;;
    "rust@1.59")
      rustc "$1" -o "$3"
      ;;
    *)
      throw_error "$2 is not supported"
      ;;
  esac
}

# For exiting with an error message
throw_error() {
  printf "Error\n" 1>&2
  printf "%s\n" "$1" 1>&2
  exit 1
}

# Execution begins here

# This script should be copied to the containers working directory,
# Which should contain a sub directory called mount
cd mount || throw_error "Failed to switch directory to mount"

# If arguments passed
if [ "$#" -gt 0 ]; then

  # Ensure source code file exists
  test -f "$1" || throw_error "$1 not found" 

  # Compile source code
  printf "Compiling\n"
  compile "$@" || throw_error "Failed to compile"
  printf "Compiling over\n"
fi

# Build demoter
printf "Building demoter"
make || throw_error "Failed to build the demoter"
printf "Building demoter over"
