# Resource Limiter and Measurer

This contains example codes to send the process to userspace, limit the cpu time of a process, memory usage and prevents it from using fork, as well as measuring the cpu and memory useage.

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