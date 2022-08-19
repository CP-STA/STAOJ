# Containerised Executioner

This directory contains the scripts used to run untrusted code in a sandboxed
environment and communicate with an interface. The code executioner compiles
code sent from an interface rom source and executes it (or just executes it in
some cases) with sandboxing and resource limiting. To sandbox the code, it is
run within a non-root container which will have additional syscall restrictions.
Resource limiting is performed using the measurer program under the tools
directory in this repository. The result and status of the testing is sent
continually to the interface.

Currently the executioner is unstable due to changes in the interface spec. A
stable version is available on the stable-web-socket branch using the old
interface. The executioner will be worked on to become deployable within the
upcoming commits

In the meanwhile, the run and compile container scripts work well and support:

- gcc 11.3 (c)
- g++ 11.3 (c++)
- java 11
- python 3.10
- ruby 3.0
- nodejs 12.22 (javascript)
- rust 1.59
- mono 6.8 (c#)

They can be examined working by running:

```
npm i
npm test
```

Which runs the testing program which tests the container scripts with different
states for each langauge.

## Issues

~~Currently, nodejs MLE testing is failing, appears to be timing out before
registering an MLE error.~~

---

# Deprecated

## Running the Script

The script can be run by calling

```bash
node executioner.mjs
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
