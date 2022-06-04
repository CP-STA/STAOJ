# Containerised Executioner

This directory contains the scripts used to run untrusted code in a sandboxed environment and communicate with the socket. The code executioner compiles code sent via the socket from source and executes it with sandboxing and resource limiting. To sandbox the code, it is run within a non-root container which will have additional syscall restrictions. Resource limiting is performed using the measurer program under the tools directory in this repository. The result and status of the testing is sent continually to the socket.

 ## Running the Script

This repository contains a startup script called start.sh which runs the program with its dependencies

 ```bash
 ./start.sh <path/to/socket> [<path/to/repo>]
 ```

To execute the script, you will need to have installed Podman, npm, and nodejs.

NOTE: In its current build, the executioner does not yet use secure containers for execution