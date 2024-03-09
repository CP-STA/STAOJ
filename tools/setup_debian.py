import subprocess
import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument('ssh_host')
args = parser.parse_args()
ssh_host = args.ssh_host

def run(s):
    subprocess.run(['ssh', '-t', ssh_host, s], check=True)

run('curl -fsSL https://deb.nodesource.com/setup_21.x | sudo bash -')
run('sudo apt-get install -y nodejs')
run('sudo apt-get update')
run('sudo apt-get -y install aptitude')
run('sudo aptitude install -y npm')
run('sudo apt-get -y install rsync podman slirp4netns fuse-overlayfs git')
run('sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)')
run('git clone https://github.com/CP-STA/STAOJ || true')
run('cd STAOJ && git submodule update --init')
run('cd STAOJ/problems-private && git pull')
run('cd STAOJ/problems && git pull')
run('cd STAOJ/executioner && npm install')

key = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', 'key.json')
key2 = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', 'key-testing.json')
env = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'executioner', '.env')

subprocess.run(['rsync', '-azP', key, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/key.json'], check=True)
subprocess.run(['rsync', '-azP', key2, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/key-testing.json'], check=True)
subprocess.run(['rsync', '-azP', env, f'{ssh_host}:/home/{ssh_host.split("@")[0]}/STAOJ/executioner/.env'], check=True)
