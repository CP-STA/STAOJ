#!/usr/bin/bash

# Script name
NAME="executioner"

# Path variables
COMPILED_NAME="compiled"
COMPILED_OUTPUT="compiled.out"
ERROR_OUTPUT="error.out"
WORKING_DIR=""
MEM_USED=0
TIME_USED=0

# Usage function
usage()
{
    echo "usage: $NAME [source] [input file/dir] [output file/dir]" 
    # Arguments: problem-id source-file language(optional)
}

# To quit the program prematurely
force_quit()
{
    rm -f "$COMPILED_NAME" "$COMPILED_OUTPUT"
    if [ $# -eq 0 ]; then
        exit 2
    else 
        exit $1
    fi
}

post_done()
{
    post_message "status" "done"
    rm -f "$COMPILED_NAME" "$COMPILED_OUTPUT"
}

# For throwing errors officially
throw_error()
{
    echo "$NAME: $1" 1>&2
    force_quit 255
}

# Hodge podge json builder
post_message()
{
    json='{'

    while [ $# -ge 2 ]; do

        json+="\"${1}\":\"${2}\""

        if [ $# -ge 4 ]; then
            json+=','
        fi

        shift 2

    done

    json+='}'

    echo "$json"
}

compile()
{
    # Compiling based on language passed
    case "$2" in
        "gcc@11.3")
            g++ "$1" -o $COMPILED_NAME
            return "$?"
            ;;
        *)
            throw_error "Unsupported file type"
            ;;
    esac
}

run()
{
    # Check language in case of special cases
    case "$1" in
        #java)

        *)
            # Execute bog-standard executable with memory and time limits
            MAX_TIME="$4" MAX_MEM="$3" ./demoter.out $COMPILED_NAME 1> "$COMPILED_OUTPUT" 2> "$ERROR_OUTPUT" < "$2" &
            PID="$!"

            # Limit cpu when running
            cpulimit -p "$PID" -l 10

            wait "$PID"
            return_code="$?"

            cat "$COMPILED_OUTPUT"
            cat "$ERROR_OUTPUT"

            # Read and remove the last two lines of the file, which contains resource usage info
            mem_info=($(tail -n 1 $COMPILED_OUTPUT))
            time_info=($(tail -n 2 $COMPILED_OUTPUT | head -n 1))
            head -n -2 $COMPILED_OUTPUT > $WORKING_DIR/_tmp && mv $WORKING_DIR/_tmp "$COMPILED_OUTPUT"

            # Get Mem and time and convert to correct units
            MEM_USED=${mem_info[-1]}
            TIME_USED=$(bc <<< "${time_info[-1]}"' * 1000')
            TIME_USED=${TIME_USED%.*}

            # TODO: Should also make checks to ensure cpu isnt overclocking to ensure all programs run fairly

            # Handle any exceptions and return adquete return code
            if [ $return_code -ne 0 ]; then
                if tail -n 1 "$ERROR_OUTPUT" | grep -c time; then
                    TIME_USED="$3"
                    return 2
                elif tail -n 1 "$ERROR_OUTPUT" | grep -c memory; then
                    MEM_USED="$4"
                    return 3
                else
                    return 1
                fi
            fi
            ;;
    esac
}

# Argument Handling
if [ $# -eq 5 ]; then

    # Check if source code file exists
    if [ ! -f "$1" ]; then
        throw_error "Source code file not found"
    fi

    if [ ! -d "$3" ]; then
        throw_error "Temp directory not found"
    fi

    WORKING_DIR="$3"
    COMPILED_NAME="$WORKING_DIR/$COMPILED_NAME"
    COMPILED_OUTPUT="$WORKING_DIR/$COMPILED_OUTPUT"
    ERROR_OUTPUT="$WORKING_DIR/$ERROR_OUTPUT"

    # Cleaning up in case of premature quitting by user
    trap force_quit SIGINT SIGTERM

    # Send compiling message
    post_message "status" "compiling"


    # Compile file and post messages
    if compile "$1" "$2"; then
        post_message "status" "compiled" "result" "success"
    else
        post_message "status" "compiled" "result" "error"
        post_done
    fi

    # Run the compiled file for each test case
    count=1
    for input in $(ls -v1 $WORKING_DIR/tests/*.in); do
        
        # Send testing message
        post_message "status" "testing" "test_case" "$count"
        run "$2" "$input" "$4" "$5" &> /dev/null

        return_code="$?"

        if [ "$return_code" -eq 0 ]; then
            # Executed successfully
            # Compare with out files

            # Get out file
            output="${input%.*}.out"

            if [ ! -f "$output" ]; then
                throw_error "corresponding test output file, $output, not found"
            fi

            # TODO: Need to clean entry output
            if diff "$COMPILED_OUTPUT" "$output"; then
                post_message "status" "tested" "result" "accepted" "test_case" "$count" "time_ms" "$TIME_USED" "memory_kb" "$MEM_USED"
            else
                post_message "status" "tested" "result" "wrong" "test_case" "$count" 
            fi
        else

            result=""
            case "$return_code" in
                # Runtime error
                1)
                    result="error"
                    ;;
                # Time limit exceeded
                2)
                    result="TLE"
                    ;;
                # Memory limit exceeded
                3)
                    result="MLE"
                    ;;
                *)
                    throw_error "Unexpected return code"
                ;;
            esac

            post_message "status" "tested" "result" "$result" "test_case" "$count"
        fi

        count=$(($count+1))
    done

    # Delete files
    rm -f  "$COMPILED_NAME" "$COMPILED_OUTPUT"
    post_done
else
   usage
   exit 254
fi
