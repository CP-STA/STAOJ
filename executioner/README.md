# Containerised Executioner

This directory contains the scripts used to run untrusted code in a sandboxed environment and communicate with the socket. The code executioner compiles code sent via the socket from source and executes it with sandboxing and resource limiting. To sandbox the code, it is run within a non-root container which will have additional syscall restrictions. Resource limiting is performed using the measurer program under the tools directory in this repository. The result and status of the testing is sent continually to the socket.

## Running the Script

The script can be run by calling

```bash
node executioner.sh
```

It requires the following environmental variables to be set:

1. REPO_PATH - absolute path to the STAOJ repo
2. EXER_SOCK - absolute path to the socket

Additionally you can run the following npm script to demonstrate and example
It runs an example socket server and sends a sample submission to the executioner

```bash
npm run example
```

This script was developed within the devcontainer included in the repo and should successfully run within it

## New changes

- The executioner should now be os agnostic.
- Makes better use of javascript's async tools
- Better queuing support
- Tests are run completly isolated from each other now, preventing programs from altering the env between tests
- However this is at the expense of slower execution times due to overhead of rerunning containers
