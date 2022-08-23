#!/usr/bin/env bash

# Modern Linux and macOS systems commonly only have a thing called `python3` and
# not `python`, while Windows commonly does not have `python3`, so we cannot
# directly use python in the shebang and have it consistently work. Instead we
# embed some bash to look for a python to run the rest of the script.
#
# On Windows, `py -3` sometimes works. We need to try it first because `python3`
# sometimes tries to launch the app store on Windows.
'''':
for PYTHON in "py -3" python3 python python2; do
    if command -v $PYTHON >/dev/null; then
        exec $PYTHON "$0" "$@"
        break
    fi
done
echo "$0: error: did not find python installed" >&2
exit 1
'''
# The rest of this file is Python.
#
# This file is only a "symlink" to bootstrap.py, all logic should go there.
import os
import sys

# If this is python2, check if python3 is available and re-execute with that
# interpreter.
if sys.version_info.major < 3:
  try:
    # On Windows, `py -3` sometimes works.
    # Try this first, because 'python3' sometimes tries to launch the app
    # store on Windows
    os.execvp("py", ["py", "-3"] + sys.argv)
  except OSError:
    os.execvp("python3", ["python3"] + sys.argv)

from genericpath import isdir
import os
import subprocess
import json
import shutil

def flatten(l):
    return [item for sublist in l for item in sublist]


def main():
  dir = os.path.dirname(os.path.dirname(__file__))
  folders_to_keep = ['.github', 'venv', 'contests']
  folders_to_not_sync = ['.git']
  with open(os.path.join(dir, 'problems-private', 'past-problems.json')) as f:
    past_problems = json.load(f)
    for problem in past_problems:
      folders_to_keep.append(problem['slug'])
  folders_to_exclude = []
  for file in os.listdir(os.path.join(dir, 'problems-private')):
    if os.path.isdir(os.path.join(dir, 'problems-private', file)):
      if file not in folders_to_keep:
        folders_to_exclude.append(file)
  exclude_args = flatten(list(map(lambda x: ['--exclude', x], folders_to_not_sync + folders_to_exclude)))
  subprocess.run(['rsync', '-aPI', '--delete'] + exclude_args + [f'{os.path.join(dir, "problems-private")}/', os.path.join(dir, 'problems')])
  for file in folders_to_exclude:
    shutil.rmtree(os.path.join(dir, 'problems', file), ignore_errors=True)



    

if __name__ == "__main__":
  main()