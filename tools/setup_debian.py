import subprocess
import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument('ssh_host')

args = parser.parse_args()

ssh_host = args.ssh_host

def ssh_run(s):
  subprocess.run(['ssh', '-t', ssh_host, s])

def apt_install(a):
  ssh_run('sudo apt-get install -y ' + ' '.join(a))

subprocess.run(['ssh', ssh_host, 'sudo apt-get install -y rsync'])

apt_install(['podman', 'slirp4netns', 'fuse-overlayfs'])

ssh_run('curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -')

apt_install(['nodejs'])

ssh_run('sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)')

ssh_run('git clone https://github.com/CP-STA/STAOJ')

ssh_run('cd STAOJ && git submodule update --init')

ssh_run('cd STAOJ/executioner && npm install')


key = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', 'key.json')
key2 = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', 'key-testing.json')
env = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', '.env')

subprocess.run(['rsync', '-azP', key, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/key.json'])
subprocess.run(['rsync', '-azP', key2, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/key-testing.json'])
subprocess.run(['rsync', '-azP', env, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/.env'])

# ssh_run('')