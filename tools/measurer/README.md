# Resource Limiter and Measurer

This contains example codes to send the process to userspace, limit the cpu time of a process, memory usage and prevents it from using fork, as well as measuring the cpu and memory usage. Real time is also limited to 3 times the cpu time limit. 

The limits for cpu time and memory are set using the environmental variables MAX_TIME and MAX_MEM in milliseconds and kilobytes respectively.

Only works on linux.

Run 
```bash
make
sudo ./demoter.out ...
```

to measure and limit whatever `...` command.

For example
```bash
make
sudo ./demoter.out python3 -c "print('hello world')"
```
