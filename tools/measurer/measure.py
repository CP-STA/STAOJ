#!/usr/bin/env python3
# Measure the memory and time useage of a process.
# Run with python3 measure.py (whatever shell command to measure). 
# For example: python3 measure.py python3 submission.py

import sys
import resource
import subprocess
from threading import Timer

def timeout(p):
  if p.poll() is None:
    p.kill()

def main():
  # Complie and run the demoter
  subprocess.run(['make']).check_returncode()
  p = subprocess.Popen(['./demoter.out', *sys.argv[1:]])

  # Hard timeout after 5 second
  t = Timer(5, timeout, args=(p, ))
  t.start()
  p.wait()
  t.cancel()

  # Print the resource useage
  resource_used = resource.getrusage(resource.RUSAGE_CHILDREN)
  print(f"User time (second) {resource_used.ru_utime}")
  print(f"Memory used (kilobytes): {resource_used.ru_maxrss}")

if __name__ == "__main__":
  main()