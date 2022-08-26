# Interface Specifications (V3)

This document specifies the definitions of many interfaces for the STAOJ so that development can happen concurrently, and different modules can talk to each other without problem. This helps with decoupling the different parts of the system. The definitions of these interface only states what “should” happen if the interface is properly implemented, leaving the implementation details to the respective authors to write. The people who use the interface should just expect that the interface works by magic like a black box. 

## Units

Unless stated otherwise `time` should be an integer in millisecond, `memory` should be an integer in kilobytes, and time stamps format should be a string in ISO format.

## Changes

These are the changes from V1:

### Rename
- Rename `judge-result` to `judge-results`.

### Executioner communication with the Frontend
- Remove boolean variables `judged` and `error` in favour of a enum string `state`.
- Add `problemName` and `subtasksCount` in `submissions/{submission}` for the frontend. 
- Add `score` and `failedSubtasks` in `submission/{submissions}` for the frontend.
- Remove states `queuing`, `compiling`, `compiled`, `done` from the list of possible states in `judge-results/{result}`, in favour of putting them in `submission/{submissions}`.
- Add `judgeTime` in `judge-results/{result}` to refer to the time the time the server receives message.
- Remove REPO_PATH environment variable.

## Code Structure

The main repo is at https://github.com/CP-STA/STAOJ. 

The repo for the published problems should be at https://github.com/CP-STA/problems, and the problems for the upcoming contests should be at https://github.com/CO-STA/problems-private. 

## Folder Structure

The root folder should contain scripts for communication between the components, bootstrapping code and etc.  

### problems [git submodule] 

This contains a folder of published problems, see the problem format section for more details 

### problems-private [git submodule]

This contains a folder of unpublished problems, see the problem format section for more details . 

### frontend

The code for the frontend, hosted on vercel. 

### executioner 

The code for the executioner. 

### tools 

General Tools for auditing, testing, etc  

## Read and Write Permissions

Each component should try to write any data or files in its own folder to avoid conflicts, although there shouldn’t be any hard checks to see if you are playing by the rule. If you are write any temporary file or a database that shouldn’t be tracked by git, remember to add it to .gitignore.  

## Database

We use firebase firestore as the database. Please see the discord channel for the API key. 

### Firebase 101

In short, firebase is a serverless database hosted by Google. It stores data in "documents" where each document is similar to a json file. Many documents can be grouped together into "collections", which is sort of like a folder on the hard drive. Unlike a folder structure, a collection cannot contain other collections. Instead, a document can have sub-collections associated with it. This forms a tree. The root of the tree can only contain collections. For example, we can have a user document in the top level collection called "users", and it has a collection called "submissions" associated with it (we won't structure data like this in reality). Refer to firebase docs for more details. The [Getting to Know Firestore](https://www.youtube.com/watch?v=v_hR4K4auoQ&list=PLl-K7zZEsYLluG5MCVEzXAQ7ACZBCuZgZ) is an excellent series to get started on.

### Data Structure

We should have the following top level collections:

- users: stores the data of users
- submissions: stores all the submissions (note we will filter based on the user field to get the submissions of a users instead of putting submission as a sub-collection of a user)

Each submission should have a sub-collection named "judge-results" in which each document refers to the judge result of a test case. 

### Submission Document Format

Each submission document should contain the following fields:

- `user` (string): the uid of the submission user. 
- `problem` (string): the id of the problem (e.g. `hello-world`).
- `problemName` (string): the name of the problem (e.g. `Hello World`)
- `subtasksCount` (int): the number of subtasks in the problem. 0 means there is no subtask. 
- `sourceCode` (string): the source code.
- `language` (string): the language id of the source code (e.g. `python-3.10`).
- `submissionTime` ([firebase.firestore.Timestamp](https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Timestamp)): the time of time the server receives the submission in ISO format 
- `state` (string | undefined): The state of the judge. Undefined implicitly means its queuing.
- `failedSubtasks` (string[] | undefined): the failed subtasks, counting from 1. Undefined means there is no failed subtasks. Having a length of 0 also means there is no failed subtask. 
- `score` (number | undefined): the score of the problem. Undefined means it is not finished judging, whereas 0 means there is no score.

The id of the firebase document should be the id of the submission. 

To make it easier add new functionalities and upgrade the system, any part of the system should ignore any field it does not recognize. 

#### Data Validation

There should be security rules that validate the contents. Moreover, a user should not be able to change or delete the content of a document once they are created. However, not all fields can be validated thoroughly. In particular, these fields will be validated when the user first submits the submission:

- `user` is the uid of the signed in user.
- `submissionTime` is the time when the server receives the submission. 
- `state`, `failedSubtasks` and `score` do not exist. 

These values will not be validated due to technical difficulties:

- `problem` is a valid problem id.
- `problemName` is actually the name of the problem. 
- `language` is a valid language id.
- `sourceCode` is safe to run.
- `subtasksCount` is actually the number of subtasks in the problem document

## Interface Between the Database and Executioner

### Introduction 

Since the web server needs to call the executioner to evaluate a script in a sandboxed environment, and the executioner needs to return the judging result to the web server in order to keep score and display the result to the user, there needs to be a way for the two processes to communicate with each other. We should use firebase firestore for communication between then because firestore is real time and it's straightforward to add a listener for changes. See Database -> Submission Document Format for the submission document format.

### Judge Result Document Format 

The judge should have six states `compiling`, `complied`, `compileError`, `judging`, `judged`, `invalidData`, `error`. These states should be reflected by the `state` field in `submissions/{submission}`. The first four states states should be self explanatory. 

- `invalidData` means the submission data is invalid but it should have been prevented by the frontend logic (for example, `language` is not noa valid language id. These are most likely unrecoverable data.
- `error` refers to unexpected error such as failing to launch podman, permission denied, etc. It means there might be a bug in the executioner and we can try to recover the run later. 

Deciding which kind of error it is is tricky because it is not clear which kind of error it is from the symptom. For example, not being able to find the `problem` might mean the data is invalid or the some bug caused filed not found. I would suggest use `invalidData` sparingly because it's far more likely that we have made an error (in frontend or backend) than someone deliberately trying to attack the system. 

For each `judge-results/{result}`. There should be the following fields:
- state (string): either `testing` or `tested`
- judgeTime ([firebase.firestore.Timestamp](https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Timestamp)): The time of the judgement at the executioner (not `serverTimestamp()`). Remember to sync the executioner's clock. 
- testCase (int): the number of test case, counting from 1.
- subtask (int | undefined): the subtask number this test case belongs to, counting from 1. undefined means there is no subtask in this problem.
- result (string | undefined): either `accepted`, `MLE`, `TLE`, `error` or `wrong`. It should be undefined if state is `testing`
- memory (int | undefined): the amount of memory used by the program in kb. 0 means 0kb of memory is used (which is probably impossible). undefined means there is no memory usage available.
- time (int | undefined): the amount of memory used by the program in ms. 0 means 0ms is used (sub millisecond execution). undefined means there is no time usage available.

## Problems and Test Cases

The problem folder should be read by the frontend and the executioner. It should exists at the path `STAOJ/problems`. In the folder, each problem should be stored in a sub-folder (no nesting should exist).  For example, `STAOJ/problems/hello-world` is the folder for the hello world problem. The name of the folder should be unique and should be used by many parts of the system to identify the problem. It should only lowercase english letters, numbers, and dash (-) lest some component in the tech stack cannot handle spaces or special characters. In the problem folder there should be five files handwritten, named “statement.md”, “test-cases.json”, “constraints.json”, “solution.xxx”, “generator.xxx”, where xxx is the suffix of whatever programming language the file uses, and one complied file `statement.json`. The following sections will explain what each file is used for. 

In addition, in the folder REPO_PATH/problem, you will find a python script named “audit.py”, run “python3 audit.py problem_name” to automatically check for the file formats and styles.  You need to installed the dependencies “pytest” and “pytest-depends” 

### statement.md

This should be the problem statement written in markdown. It should have the following format. Check the document “[CP Problems Format.docx](https://universityofstandrews907.sharepoint.com/:w:/r/sites/CompetitiveProgrammingStAndrews/Shared%20Documents/General/CP%20Problems%20Format.docx?d=w646d3092cdde4d7ba6829ad28e43cd3e&csf=1&web=1&e=OfZ1C3)” in the share folder to see what you should write for these sections. Note that the bracket after each subtask denotes the portion of the total mark this subtask can gain.  

````
# Name of the problem 

## Author 

 

Your Name 

 

## Time (ms) 

 

The allowed time in millisecond 

 

## Memory (kb) 

 

The allowed amount of memory in kb 

 

## Difficulty 

 

*** 

 

## Tags 

 

some tags, separated by, commas

 

## Problem Statement  

 

The problem statement 

 

## constraints 

 

The general constraints 

 

### Subtask 1 (.3) 

 

The constraints for subtask 1 

 

### Subtask 2 (.7) 

 

The constraints for subtask 2 

 

## Input 

 

The format for the input  

 

## Output 

 

The format for the output 

 

## Examples 

 

### Input  

 

```

An example in input 

```

 

### Output 

 

```

An example output 

```

````

### statement.json

This file should complied from `statement.md` with the command

```bash
python3 compile_statement.py `folder name`
```
 In other word, `statement.md` should be the single source of truth and this files should not be edited directly. Change `statement.md` and recompile if the statement needs to change. 

This is a json file with the following fields:

- `name` (string): name of the problem
- `author` (string)
- `time` (integer): allowed time
- `memory` (integer): allowed memory
- `difficulty` (string)
- `tags` (array of strings)
- `statement` (string): problem statement
- `subtasks` (array of maps)
  - `score` (float): the fraction of score for this subtask
  - `constraints` (string)
- `examples` (array of maps)
  - `input` (string)
  - `output` (string)
  - `subtask` (integer): (optional) the number of subtask this example belongs to. Count the subtask from 1.

### test-cases.json

This should describe the test cases. This should be a json array, with each element describing a test case. For each element, there should be two compulsory keys “input”, “output”, there should also be an optional key “subtask”. The “input” key should be a string denoting the input for the test case. Unless stated in the problem, all words and numbers should be separated by exactly on space. There should be no leading or trailing whitespace before and after a line. The test case should always end with a new line character.  

However, the format of the output should be less strict. Any leading or trailing whitespace should be ignored, and words separated by multiple consecutive whitespaces should also be accepted. Generally, the solution should be accepted if .split() in python returns the same result for the expected and the actual output.  

Although not required, it would be the best if the json is pretty printed so that it’s human readable to some extent.  

### constraints.json

This file should contain a json object (dictionary) that contains two keys, `memory`, which value is an integer that denotes the memory limit in kilobytes, and `time`, which value is an integer which denotes the time limit in millisecond.  


### solution.xxx

This should be the correct solution to the problem.  

### generator.xxx 

If you have used some script to generate the test cases (hopefully you didn’t just write them by hand), please include it in here.  
