# Containerised Executioner

This directory contains the scripts used to run untrusted code in a sandboxed
environment and communicate with an interface. The code executioner compiles
code sent from an interface rom source and executes it (or just executes it in
some cases) with sandboxing and resource limiting. To sandbox the code, it is
run within a non-root container which will have additional syscall restrictions.
Resource limiting is performed using the measurer program under the tools
directory in this repository. The result and status of the testing is sent
continually to the interface.

Currently, the executioner interfaces with the firestore database. It connects
to the db using a json key file and listens for changes to the submissions
collection. Messages are conveyed by adding documents to a 'judge-results'
collection. 

To run the executioner, the following environmental variables need to be set:

- `REPO_PATH` : Path to the STAOJ repository
- `GOOGLE_APPLICATION_CREDENTIALS` : Path to the firestore key file

Then you'll need to install the dependencies and build the sandbox container
with the following command:

```
npm install
```

Once that is complete you can run the following command to start the executioner:

```
npm start
```

The executioner currently works with:

- gcc 11.3 (c)
- g++ 11.3 (c++)
- java 11
- python 3.10
- ruby 3.0
- nodejs 12.22 (javascript)
- rust 1.59
- mono 6.8 (c#)
