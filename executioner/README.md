# Containerised Executioner

This directory contains the scripts used to run untrusted code in a sandboxed environment and communicate with the socket. The code executioner compiles code sent via the socket from source and executes it with sandboxing and resource limiting. To sandbox the code, it is run within a non-root container which has additional syscall restrictions. Resource limiting is performed using the measurer program under the tools directory in this repository. The result and status of the testing is sent continually to the socket.

 ## Running the Container

This repository contains a startup script called start.sh which builds and runs the container image.
 ```bash
 ./start.sh <path/to/socket> [<path/to/problem_repo>]
 ```
To execute the script, you will need to have installed Podman and npm.
 
 ## Exploitation Risks and Solutions
 
Whilst hopefully participants submitting code to the executioner will not try to exploit their testing environment, measures should still be in place to prevent it if they do.
 
 ### 1) Accessing the problems and other users' submissions

To access the problem repository within the container, the repo is bind mounted in the container such that the script may have access to the problem tests and limits. However, unless stopped, executed code could try to access the problems and read the answers directly. Whilst they would be unable to communicate the answers to the author due to the container being severed from a network connection, the code could still write out the answers and consequently pass the tests. Additionally, it is likely that the executioner will be executing other submissions simultaneously and so these files must also be hidden from each other.

To prevent this, untrusted code should be executed as unique users and the neccessary files and directories should have permissions in place to prevent non-root (relative to the container) users from accessing them.

### 2) Accessing the socket

Untrusted code could potentially access the socket and send their own fabricated messages to the web server. As the socket is also bind mounted in the container so that it may be accessed, this also leads to a similar situation as #1. 

While sockets differ from directories and files, permissions should apply the same to them also. In the case that this does not work, messages could possibly be sent with an identifying key generated on runtime and kept in a file unaccessible to the untrusted code. Therefore code trying to send messages would not have access to the identifying key and so the webserver will ignore and/or report the incident. However this idea is probably a bit overkill

### 3) Bypassing limits

Untrusted code could try to bypass resource limits through means such as using virtual memory (if it is not also restricted) or delaying the execution of the program. As execution time will likely be measured with cpu time, a command like ```sleep 10000``` would not impact the cpu time yet will still last much longer than the specified time.

Therefore, resource limits must be rigourous and contain some backups such as killing the program after a certain amount of real time has passed to avoid hanging programs.



