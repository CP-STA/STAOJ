import argparse
import sys
import subprocess
import json

with open('test-cases.json') as f:
  test_cases = json.load(f)

for i, test_case in enumerate(test_cases):
  p = subprocess.run(sys.argv[1:], input=test_case['input'].encode('utf-8'), capture_output=True)
  answer = p.stdout.decode('utf-8')
  answer = int(answer)
  if answer != int(test_case['output']):
    print(i, answer, int(test_case['output']))
  else:
    print(i, 'correct')

