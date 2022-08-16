# Interface Specifications (V2)

This document specifies the definitions of many interfaces for the STAOJ so that development can happen concurrently, and different modules can talk to each other without problem. This helps with decoupling the different parts of the system. The definitions of these interface only states what “should” happen if the interface is properly implemented, leaving the implementation details to the respective authors to write. The people who use the interface should just expect that the interface works by magic like a black box. 

## Units

Unless stated otherwise `time` should be an integer in millisecond, `memory` should be an integer in kilobytes, and time stamps format should be a string in ISO format.

## Changes

These are the changes from V1:

### Inconsistency
- `constrains` and `constraints` were both used in version 1 in previous version. Rename all `constrains` to `constraints`.

### Naming Convention
- Use camelCase instead of snake_case for dictionary keys.
- Change the problem ids from using snake_case to hyphen-case. 
- Change the problem ids to only allowed lower case english letters, numbers and dash (-). 
- Rename `test_cases.json` to `test-cases.json`. 
- Rename `time_ms` to `time` and `memory_kb` to `memory`. 
- Add complied `statement.json`

### Ways of Communication
- Change how the executioner communicates with the database.

### Misc
- Change the git folder structure
  - Rename `problems` to `problems-private`
  - Add `problems` to refer to `CP-STA/contest-problems`
  - Remove `webserver`
  - Add `frontend` to refer to git submodule `CP-STA/contest-problems`

## Code Structure

The main repo is at https://github.com/STAOJ/STAOJ. The path of this repo should be available for every process through the environmental variable REPO_PATH. 

The repo for the published problems should be at https://github.com/STAOJ/problems, and the problems for the upcoming contests should be at https://github.com/STAOJ/problems-private. The problems repo does not have to share an overlapping history with the private repo because the problems might not be written concurrently.  

## Folder Structure

The root folder should contain scripts for communication between the components, bootstrapping code and etc.  

### problems [git submodule] 

This contains a folder of published problems, see the problem format section for more details 

### problems-private [git submodule]

This contains a folder of unpublished problems, see the problem format section for more details . 

### frontend [git submodule]

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

Each submission should have a sub-collection named "judge-result" in which each document refers to the judge result of a test case. 

### Submission Document Format

Each submission document should contain the following fields:

- `user` (string): the uid of the submission user. 
- `problem` (string): the id of the problem (e.g. `hello-world`).
- `sourceCode` (string): the source code.
- `language` (string): the language id of the source code (e.g. `python-3.10`).
- `submissionTime` ([firebase.firestore.Timestamp](https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Timestamp)): the time of time the server receives the submission in ISO format
- `judged` (boolean): `true` iff the executioner has not finished judging, otherwise `false`.
- `error` (boolean): `true` iff there is some generic error prevents the submission from being judged. This includes invalid document format. 

The id of the firebase document should be the id of the submission (it is not used currently anywhere). 

To make it easier add new functionalities and upgrade the system, any part of the system should ignore any field it does not recognize. 

#### Data Validation

There should be security rules that validate the contents. Moreover, a user should not be able to change or delete the content of a document once they are created. However, not all fields can be validated thoroughly. In particular, these fields will be validated:

- `user` is the uid of the signed in user.
- `judged` is false when the submission is first submitted. 
- `error` is false when the submission is first submitted.
- `submissionTime` is the time when the server receives the submission. 

These values will not be validated due to technical difficulties:

- `problem` is a valid problem id.
- `language` is a valid language id.
- `sourceCode` is safe to run.

Both `error` and `judged` logically should not be both true at the same time. If they are both true, any part of the program that depends on the two values should just fail because that signals a potential logical bug somewhere else. It's better to get the programmer's attention to fix it than to fail silently. 

## Interface Between the Database and Executioner

### Introduction 

Since the web server needs to call the executioner to evaluate a script in a sandboxed environment, and the executioner needs to return the judging result to the web server in order to keep score and display the result to the user, there needs to be a way for the two processes to communicate with each other. We should use firebase firestore for communication between then because firestore is real time and it's straightforward to add a listener for changes. See Database -> Submission Document Format for the submission document format.

### Judge Result Document Format 

When the problem source code is sent to the executioner, it should either entire the state `queuing` or `compiling` depending on if there is enough system resource to compile and test the submission.  

When the source has been complied (or failed to complied), it should enter the “complied” state. It should also have another key named `result`, which can either be `success` or `error`. If it is `error`, it should stop and change the `judged` field in the submission document to true. 

As soon as a test case begins, it should enter the state `testing`, with another key named `testCase` with an integer key (not a string of the integer) which denotes the number of the test case, counting from 1.  

When the test case completes, it should enter the state `tested` before it runs the next test case. In this state, it should communicate the result of the test case and the number of the test case in `testCase`. There should be four possible results `accepted`, `wrong` (wrong answer), `TLE` (time limit exceeded), `MLE` (memory limit exceeded), or `error` (runtime error). If the result is `wrong`, `TLE`, `MLE`, or `error`, it should continue running the next test cases, other parts of the system should deal with tallying the score. If the result is `accepted`, it should also have a key `time`, which value is an integer denotes the run time in millisecond, and a key `memory` which value is an integer denoting the memory used in kb (kilobytes).  

When all the test cases are complete, it should enter the state `done`.  

After it changed `judged` to `true`, it should not write any more document to the sub-collection. 

If there is any unexpected error or the input data does not make sense, change `error` to `true` and stop.

### Trust and Input Sanitization 

Check Data Structure -> Submission Document Format -> Data Validation to see which fields can be trusted. If the `problem` or `language` does not match one in the database, it should change `error` to `true` and stop. There is no need for a nice error message because as frontend validates these fields, these fields being invalid means either a bug or someone deliberate is deliberately trying to attack the system. The executioner should not trust the code and execute it with proper sandboxing.

## Problems and Test Cases

The problem folder should be read by the frontend and the executioner. It should exists at the path `REPO_PATH/problems`. In the folder, each problem should be stored in a sub-folder (no nesting should exist).  For example, `REPO_PATH/problems/hello-world` is the folder for the hello world problem. The name of the folder should be unique and should be used by many parts of the system to identify the problem. It should only lowercase english letters, numbers, and dash (-) lest some component in the tech stack cannot handle spaces or special characters. In the problem folder there should be five files handwritten, named “statement.md”, “test-cases.json”, “constraints.json”, “solution.xxx”, “generator.xxx”, where xxx is the suffix of whatever programming language the file uses, and one complied file `statement.json`. The following sections will explain what each file is used for. 

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
