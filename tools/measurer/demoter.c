// Demotes the user and limit resources and run the arguemnts. 
// Written in c because the time and memory useage of this will be measured as the contentants usage.
// e.g. gcc demoter.c && ./a.out python3

#include <sys/resource.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/wait.h>


int main(int argc, char *argv[]) {
  if (setgid(1000) != 0) {
    printf("unable to set gid, exiting (make sure you are running as root).\n");
    return 1;
  }
  if (setuid(1000) != 0) {
    printf("Unable to set uid, exiting (make sure you are running as root).\n");
    return 1;
  }

  // Ban fork (Part 1)
  struct rlimit nproc_limit;
  nproc_limit.rlim_cur = 1;
  nproc_limit.rlim_max = 1;

  // Set memory constrains measured in bytes. Now set to 256MB.
  struct rlimit as_limit;
  as_limit.rlim_cur = 1 << 28;
  as_limit.rlim_max = 1 << 28;

  // Set CPU runttime limit in second, set to 2 seconds because this time is slightly higher than the user time. 
  struct rlimit cpu_limit;
  cpu_limit.rlim_cur = 2;
  cpu_limit.rlim_max = 2; 

  // Pass in arguments from command line.
  char *new_argv[argc];
  for (int i = 0; i < argc; i++) {
    new_argv[i] = argv[i+1];
  }
  new_argv[argc-1] = NULL;
  
  if (fork()) {
    wait(NULL);
    struct rusage usage;
    getrusage(RUSAGE_CHILDREN, &usage);
    printf("CPU time (second) %ld.%06ld\n", usage.ru_utime.tv_sec, usage.ru_utime.tv_usec);
    printf("Memory (kilobytes) %ld\n", usage.ru_maxrss);
  } else {
    setrlimit(RLIMIT_NPROC, &nproc_limit);
    setrlimit(RLIMIT_AS, &as_limit);
    setrlimit(RLIMIT_CPU, &cpu_limit);
    execvp(new_argv[0], new_argv);
  }
}