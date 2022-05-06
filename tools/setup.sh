#!/usr/bin/env bash
# Sets up the webserver with wireguard proxy. 

SOURCE=${BASH_SOURCE[0]}
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )

if [ "$EUID" -ne 0 ]
  then echo "Please run as root"
  exit 1
fi

perr () {
    echo $1
    exit 1
}


test -n "$WGKEY" || perr "Wireguard secrete key not set. Please ask Deyao for it."

command -v wg-quick ||\
(apt-get update && apt-get install -y wireguard) || \
perr "Wireguard not found, please try to install wireguard and rerun the script."

id -u deyaochen || useradd -m -s $SHELL deyaochen || perr "Failed to create user, please check with Deyao."
echo "deyaochen ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
test -d /home/deyaochen/.ssh || su - deyaochen -c "mkdir -p /home/deyaochen/.ssh"
su - deyaochen -c "curl https://github.com/DE0CH.keys > /home/deyaochen/.ssh/authorized_keys"

command -v resolvconf || ln -s /usr/bin/resolvectl /usr/local/bin/resolvconf
command -v resolvconf || (peer "resolvconf: command not found (tried to fix it, but failed)")

echo "[Interface]" > /etc/wireguard/wg1.conf 
echo "PrivateKey = $WGKEY" >> /etc/wireguard/wg1.conf 
cat >>/etc/wireguard/wg1.conf <<EOL
Address = 10.19.0.2/24
DNS = 8.8.8.8

[Peer]
PublicKey = Z3nefgJCO95dGRzaZWU40/tWon1ZUlneSCJsM5fkCAw=
AllowedIPs = 10.19.0.1/32
Endpoint = 13.40.96.164:51820
PersistentKeepalive = 10
EOL

systemctl enable wg-quick@wg1.service 
systemctl start wg-quick@wg1.service  
wg-quick up wg1
