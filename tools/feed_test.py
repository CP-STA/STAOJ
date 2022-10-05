import argparse
import sys
import subprocess
import json
import time

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

with open('test-cases.json') as f:
  test_cases = json.load(f)

has_incorrect = False
for i, test_case in enumerate(test_cases):
  start = time.time()
  p = subprocess.run(sys.argv[1:], input=test_case['input'].encode('utf-8'), capture_output=True)
  answer = p.stdout.decode('utf-8')
  if answer.split() != test_case['output'].split():
    print(i+1, bcolors.FAIL + 'incorrect' + bcolors.ENDC)
    has_incorrect = True
  else:
    print(i+1, 'correct')
  print(time.time() - start)

if has_incorrect:
  print(bcolors.FAIL + "Some test cases did not pass." + bcolors.ENDC)
