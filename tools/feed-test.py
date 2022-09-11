import argparse
import sys
import subprocess
import json

with open('test-cases.json') as f:
  test_cases = json.load(f)

for i, test_case in enumerate(test_cases):
  p = subprocess.run(sys.argv[1:], input=test_case['input'].encode('utf-8'), capture_output=True)
  answer = p.stdout.decode('utf-8')
  if answer.split() != test_case['output'].split():
    print(i, 'incorrect')
  else:
    print(i, 'correct')

