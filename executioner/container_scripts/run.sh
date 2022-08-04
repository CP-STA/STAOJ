#!/usr/bin/bash

# This script executes a compiled file based on the language
# By default it will try to execute the file as a native executable
# This is intended to be run inside a container and the compiled file

# Script requires 3 arguments
# 1. compiled code file name
# 2. compiled code language
# 3. input file
# 4. output file
# 5. error file


# Script arguments are passed to this function in the same order
run() {
  case "$2" in
    #java)

    *)
      # Max mem and max time env vars should already be set in container
      ./demoter.out ./"$1" 1> "$4" 2> "$5" < "$3"

      # Return error code
      return "$?"
  esac
}

throw_error() {
  printf "error\n" 1>&2
  printf "%s\n" "$1" 1>&2
  exit 1
}

# Execution begins here

# Move to mount dir
cd mount || throw_error "Failed to switch directory to mount"

# Ensure neccessary files exist
test -f demoter.out || throw_error "demoter.out not found"
test -f "$1" || throw_error "$1 not found" 

printf "Running\n"
run "$@" || throw_error "Failed to execute code"
printf "Running over\n"
