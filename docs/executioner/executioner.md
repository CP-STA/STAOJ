# Executioner State Diagram

This represents a diagram of the messages sent in the executioner to the
executioner interface. This was created to help visualize the state of the
executioner and what needs to be tested.

Note that the messages sent by the executioner to the interface does not
neccessarily represent the state updated in whatever the executioner interfaces
with. In the case of the firestore interface, only the testing and tested
messages are added directly to a collection. The rest of the messages, for
example, are used to update other fields.

```mermaid 
stateDiagram-v2

state is_valid <<choice>>
state is_compile_needed <<choice>>
state is_compile_success <<choice>>
state is_test_error <<choice>>
state is_test_right <<choice>>
state is_mle <<choice>>
state is_tle <<choice>>
state is_more_tests <<choice>>
state is_errors <<choice>>
state join_testing <<join>>
state join_tested <<join>>
state join_done <<join>>

pending: (Pending)
executing: Executing
compiling: Compiling
compiled_success: Compiled Success
compiled_error: Compiled Error
testing: Testing
tested_acc: Tested Accepted
tested_wro: Tested Wrong
tested_mle: Tested MLE
tested_tle: Tested TLE
tested_err: Tested Error
done: Done
error: Error
invalid: Invalid

note right of executing
  A node in this graph represents a message
  sent to the executioner interface. The first
  word represents the message state. The
  second (if any) represents the message 
  result. '(pending)' is not a message though.
end note

note left of compiling
  Code is compiled within a container,
  and the demoter is also built. See the 
  demoter diagram for its possible state.

end note

note right of testing
  Code is run 
  within a
  container
  by the
  demoter

end note

note left of done
  Done is one of 3 possible end messages.
  The other 2 are only sent if some error
  is thrown during execution.
end note

note right of done
  Done may also include a `score`
  and `failedSubtasks` property.
  Which properties are included
  are explained in the following
  graph.
end note

[*]-->pending: Interface has new submission
pending-->executing: Executioner reads submission
executing-->is_valid: Valid submission?
is_valid-->is_compile_needed: Yes, compilation required?
is_valid-->invalid: No
invalid-->[*]: Error thrown
is_compile_needed-->compiling: Yes
is_compile_needed-->join_testing: No

compiling-->is_compile_success: Compiled successfully?
is_compile_success-->compiled_error: No
compiled_error-->join_done
is_compile_success-->compiled_success: Yes
compiled_success-->join_testing

join_testing-->testing: Test submission with input
testing-->is_test_error: No errors?

is_test_error-->is_mle: No, memory limit exceeded?
is_mle-->tested_mle: Yes
tested_mle-->join_tested 

is_mle-->is_tle: No, time limit exceeded?
is_tle-->tested_tle: Yes
tested_tle-->join_tested

is_tle-->tested_err: No
tested_err-->join_tested

is_test_error-->is_test_right: Yes, correct output? 
is_test_right-->tested_acc: Yes
tested_acc-->join_tested
is_test_right-->tested_wro: no
tested_wro-->join_tested

join_tested-->is_more_tests: More tests left?
is_more_tests-->join_testing: Yes
is_more_tests-->join_done: No

join_done-->is_errors: Did any errors occur?
is_errors-->done: No
done-->[*]: Execution complete

is_errors-->error: Yes
error-->[*]: Error thrown

```
```mermaid
stateDiagram-v2
state "Done Properties" as dp {
  state dp_is_compilation_error <<choice>>
  state dp_is_subtasks <<choice>>
  state dp_join_end <<join>>
  dp_score: Include "Score"
  dp_failedSubtasks: Include "failedSubtasks"
  [*]-->dp_is_compilation_error: Compilation error?
  dp_is_compilation_error-->dp_join_end: Yes
  dp_is_compilation_error-->dp_score: No
  dp_score-->dp_is_subtasks: Problem has subtasks?
  dp_is_subtasks-->dp_failedSubtasks: Yes
  dp_is_subtasks-->dp_join_end: No
  dp_failedSubtasks-->dp_join_end

  dp_join_end-->[*]: Send Done message
}
```