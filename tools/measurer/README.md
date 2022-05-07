# Resource Limiter and Measurer

This contains example codes to send the process to userspace, limit the cpu time of a process, memory usage and prevents it from using fork, as well as measuring the cpu and memory useage.

Run 
```bash
sudo python3 measure.py ...
```

to measure and limit whatever `...` command.

For example
```bash
sudo python3 measure.py python3 -c "print('hello world')"
```