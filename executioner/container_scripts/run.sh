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
  # Max mem and max time env vars should already be set in container
  case "$2" in
    "java-11")
      passed_mem=$MAX_MEM
      MAX_MEM=-1 ./demoter.out java -Xmx"${passed_mem}k" "${1%.*}" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "gpp-11.3")
      ./demoter.out ./"$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "gcc-11.3")
      ./demoter.out ./"$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "python-3.10")
      ./demoter.out python3 "$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "ruby-3.0")
      ./demoter.out ruby "$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "nodejs-12.22")
      # Node accepts mem in mb so divide by 1000
      passed_mem=$((MAX_MEM/1000))
      MAX_MEM=-1 ./demoter.out node --max-old-space-size="$passed_mem" "$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "rust-1.59")
      ./demoter.out ./"$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    "mono-6.8")
      passed_mem="$MAX_MEM"
      MONO_GC_PARAMS=max-heap-size="${passed_mem}k" MAX_MEM=-1 ./demoter.out mono "$1" 1> "$4" 2> "$5" < "$3"
      return "$?"
      ;;
    *)
      throw_error "$2 is not supported"
      ;;
  esac
}

MLE="Out of memory!"
TLE="Out of time!"

# Accepts the error file name and language and interprets the error message based on the language
interpret() {
  case "$2" in
    "java-11")
      if ! grep "$MLE" "$1"; then
        if grep "OutOfMemoryError" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "gpp-11.3")
      if ! grep "$MLE" "$1"; then
        if grep "std::bad_alloc" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "python-3.10")
      if ! grep "$MLE" "$1"; then
        if grep "MemoryError" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "ruby-3.0")
      if ! grep "$MLE" "$1"; then
        if grep "failed to allocate memory" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "nodejs-12.22")
      if ! grep "$MLE" "$1"; then
        if grep "heap out of memory" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "rust-1.59")
      if ! grep "$MLE" "$1"; then
        if grep "memory allocation of .* failed" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
    "mono-6.8")
      if ! grep "$MLE" "$1"; then
        if grep "System.OutOfMemoryException" "$1"; then
          echo "$MLE" >> "$1"
        fi
      fi
      ;;
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

printf "Running\n"
if ! run "$@"; then 
  cat error.out 1>&2
  interpret "$5" "$2"
  throw_error "Execution failed"
fi
printf "Running over\n"
