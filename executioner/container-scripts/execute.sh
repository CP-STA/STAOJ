#!/usr/bin/bash

# The overarching shell script which runs the compile and run scripts in the same container

# Runs compile, then runs test cases in order

# Arguments
# 1. source code final name
# 2. language
# 3. compiled
# 4. in directory
# 5. result directory

# Accepts two arguments, source code final name and language
# Assigns the compiled name var
get_compiled_name() {
  case "$2" in
    "java-11")
      compiled_name="${1%.*}.class"
    ;;
    *)
      compiled_name="compiled"
    ;;
  esac
}

exit_with_done() {
  printf "done\n"
  exit 0
}

# If compiled language then compile code, build demoter anyway
if [ "$3" -eq 1 ]; then
  # Get compiled name and compiled
  get_compiled_name "$1" "$2"

  printf "compiling\n"
  if ./compile.sh "$1" "$2" "$compiled_name" 1> /dev/null; then
    result="success"
  else 
    result="error"
  fi
  printf "compiled %s\n" "$result"
  if [ $result = "error" ]; then
    exit_with_done
  fi

else
  # Just build demoter otherwise
  compiled_name="$1"
  ./compile.sh 1> /dev/null
fi

for in_file in mount/"$4"/*; do

  # Parse test number
  in_name=${in_file%.*}
  count=${in_name:(-3)}

  printf "testing %s\n" "$count"
  if ./run.sh "$compiled_name" "$2" "${in_file#*/}" "${5}/result${count}.out" "${5}/error${count}.out" 1> /dev/null; then
    result="success"
  else
    result="error"
  fi
  printf "tested %s ${result}\n" "$count"
done

exit_with_done
