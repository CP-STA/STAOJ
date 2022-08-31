# The Test Generator

So the Executioner will end up having a lot of languages, types of submissions,
and types of problems. One could manually write tests to test each of these
languages, types etc. but that would take a while. Hence the idea of the test
generator.

## Prexisting generated tests

Tests like run.test.mjs, compile.test.mjs, and executor.test.mjs already
implement this test generation on a smaller level by generatoring a bunch of
test cases baased on the languages and request types in the `sample-submissions`
directory. These work by basically determining what requests and languages there
are synchronously and then iterating through the possible combinations
synchronously (as tests must be defined as such).

However, this only operates with 2 dimensions. As I wrote more tests like the
executioner.test.mjs and the subtasks.test.mjs generating test cases in the same
2 dimensions, with the latter even iterating between 3 problems, I realised that
I would still have to test interfaces for each of these. E.g writing a
subtasks-firestore test file and executioner-firestore test file. This is obviously quite tedious and not sustainable, so that's truly where the idea of generating all these tests with the Test Generator came from.

When testing the executioner wholly, rather then just generate tests by language
and request type and then define the problem and interface test files manually,
why not combine them all into one? Whislt this might sound a bit crazy and dare
I say 'over-engineered', it is not as crazy as one might think.

## Observations

These tests will be running through the main executioner entry function. That
is, they will be executing `runExecutioner` with some interface. Therefore, this
makes the tests somewhat unique from the other generated test cases as (one
might poetically say) the black box has enlargened. This means that certain
combinations of of problems and requests and so on might become redundant. For
example, there is never reason to test the compileSuccess request with the
`runExecutioner` function as nothing ends with compileSuccess. The same goes for
problems like test-subtask-pass, which focues on how subtasks are handled. In
that case, whether a test fails by mle or tle or whatever won't matter when
testing subtasks as the subtask fails regardless. Therefore, we can derive the
following decisions when creating the Test Generator:

### Languages are independent

Whilst most languages in theory should act the same as the executioner does very
little to change the code on a per language basis (except for java) it is still
perhaps good practise to test the executioner and it's interfaces for each
language just in case.

### Request types are based on problems

When creating the executioner and subtask tests, I found that I basically
associated these with specific test problems, and decided the request types to
tests based on these problems. Therefore, declaring the testing request type
based on the problem sounds logical.

### Interfaces are the backbone

To run the executioner function requires an interface to be passed, and that is
key to how the executioner communicates state to test. Therefore, interfaces are
the backbone of these tests and all logic relating to checking state
communicated via the interface should be included with the interface.
Essentially, this means interfaces will form the different test macros, as that
will allow for test assertions to be made based on whatever data like language
or problem is passed on a per interface basis.

In particular the flow the test macros should go as such:

1. The macro accepts requestName, language, and problem

2. It initialises the test interface with whatever logic to store the outputted
state from the executioner

3. The executioner function is then called with the interface

4. A submission is then pushed via the interface to be handled

5. Upon the submission execution completing, the output state is checked

6. The expected value of the output state is determined based on the language,
problem, and request type dynamically and compared with the output

## Wrapping up

I wrote this little run down of the test generator to walk through my thoughts, decided what would be best, and detect any redundancies. After writing this up, I think I have a good idea of how I am going to approach this.
