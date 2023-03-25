import argparse
import sys
import subprocess
import json
import time

parser = argparse.ArgumentParser()
parser.add_argument('--no-display-wrong', '--nd', action='store_true')
parser.add_argument('cmd', nargs='+')
args = parser.parse_args()

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
  p = subprocess.run(args.cmd, input=test_case['input'].encode('utf-8'), capture_output=True)
  answer = p.stdout.decode('utf-8')
  if answer.split() != test_case['output'].split():
    if 'subtask' in test_case:
      print(i+1, bcolors.FAIL + f'incorrect for subtask {test_case["subtask"]}' + bcolors.ENDC)
    else:
      print(i+1, bcolors.FAIL + 'incorrect' + bcolors.ENDC)
    if not args.no_display_wrong:
      print("input was ", test_case['input'])
      print("should be ", test_case['output'].split())
      print("but found ", answer.split())
      print("stderr was ", p.stderr.decode('utf-8'))
    has_incorrect = True
  else:
    print(i+1, 'correct')
  print(time.time() - start)

if has_incorrect:
  print(bcolors.FAIL + "Some test cases did not pass." + bcolors.ENDC)
