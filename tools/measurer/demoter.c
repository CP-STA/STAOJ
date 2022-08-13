// Demotes the user and limit resources and run the argumnts. 
// Written in c becauseperl -e 'while ($i<100000000) {$a->{$i} = $i++;} the time and memory usage of this will be measured as the contestants usage.
// e.g. gcc demoter.c && ./a.out python3

#include <sys/resource.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <errno.h>
#include <math.h>

// Executed child process id
int exe_pid = 0;

// Resource limits set with environmental variables

// (in milliseconds)
char* max_time_env = "MAX_TIME";

// (in kilobytes)
char* max_mem_env = "MAX_MEM";

// Handler of alarm signal after real time limit passes
void alarm_handler(int signum) {
    if (exe_pid != 0) {
        kill(exe_pid, SIGKILL);
        fprintf(stderr, "Out of time!\n");
    }
}

int main(int argc, char *argv[]) {
  if (setgid(1000) != 0) {
    fprintf(stderr, "Unable to set gid, exiting (make sure you are running as root).\n");
    return 1;
  }
  if (setuid(1000) != 0) {
    fprintf(stderr, "Unable to set uid, exiting (make sure you are running as root).\n");
    return 1;
  }

  if (!getenv(max_mem_env)) {
    fprintf(stderr, "Environmental variable %s not found\n", max_mem_env);
    return 1;
  }
  if (!getenv(max_time_env)) {
    fprintf(stderr, "Environmental variable %s not found\n", max_time_env);
    return 1;
  }

  int max_time = atoi(getenv(max_time_env));
  int max_mem = atoi(getenv(max_mem_env));

  if (max_time <= 0) {
      fprintf(stderr, "%s must be a positive integer representing the number of milliseconds of CPU time allowed\n", max_time_env);
      return 1;
  }

  if (max_mem <= 0) {
      fprintf(stderr, "%s must be a positive integer representing the number of KB of memory allowed\n", max_mem_env);
      return 1;
  }

  // Ban fork (Part 1)
  struct rlimit nproc_limit;
  nproc_limit.rlim_cur = 1;
  nproc_limit.rlim_max = 1;

  // Set memory constrains measured in bytes to some number of kilobytes
  struct rlimit as_limit;
  int max_mem_in_bytes = (1 << 10) * max_mem;
  as_limit.rlim_cur = max_mem_in_bytes;
  as_limit.rlim_max = max_mem_in_bytes;

  // Set CPU runtime limit in seconds (converting max_time from milliseconds) (real time limit is 3x this number)
  struct rlimit cpu_limit;
  int max_time_in_seconds = ceil(max_time / 1000.0);
  cpu_limit.rlim_cur = max_time_in_seconds;
  cpu_limit.rlim_max = max_time_in_seconds;

  // Pass in arguments from command line.
  char *new_argv[argc];
  for (int i = 0; i < argc; i++) {
    new_argv[i] = argv[i+1];
  }
  new_argv[argc-1] = NULL;

  exe_pid = fork();
  if (exe_pid) {
    // Set real time limit to 3x that of cpu time limit
    alarm(max_time_in_seconds * 3);
    signal(SIGALRM, alarm_handler);

    int status;
    wait(&status);
    exe_pid = 0;

    struct rusage usage;
    getrusage(RUSAGE_CHILDREN, &usage);
    
    // Check for timeout
    // Check for mem exceed in case program exits before
    if (status) {
        if (usage.ru_utime.tv_sec >= max_time_in_seconds || (usage.ru_utime.tv_sec == max_time_in_seconds - 1 && usage.ru_utime.tv_usec > 980000l)) {
            fprintf(stderr, "Out of time!\n");
        }
        if (max_mem - usage.ru_maxrss < 4000) {
            fprintf(stderr, "Out of memory!\n");
        }
    }

    printf("CPU time (milliseconds) %ld\n", usage.ru_utime.tv_sec * 1000 + usage.ru_utime.tv_usec / 1000);
    printf("Memory (kilobytes) %ld\n", usage.ru_maxrss);

    // Indicate something wrong with executed program
    if (status) {
        return 255;
    }

    // Indicate that program not executed correctly
  } else {
    setrlimit(RLIMIT_NPROC, &nproc_limit);
    setrlimit(RLIMIT_AS, &as_limit);
    setrlimit(RLIMIT_CPU, &cpu_limit);
    execvp(new_argv[0], new_argv);

    if (errno) {
      fprintf(stderr, "errno %i when executing file\n", errno);
      return 1;
    }
  }
}
