# Containerised Executioner

 This directory contains the scripts used to run untrusted code in a sandboxed environment and communicate with the socket. The code executioner compiles code sent via the socket from source and executes it with sandboxing and resource limiting. To sandbox the code, it is run within a non-root container which has additional syscall restrictions. Resource limiting is performed using the measurer program under the tools directory in this repository. The result and status of the testing is sent continually to the socket.

 ## Running the Container

 This repository contains a startup script called start.sh which builds and runs the container image.
 ```bash
 ./start.sh <path/to/socket> [<path/to/problem_repo>]
 ```
 To execute the script, you will need to have installed Podman and npm.
