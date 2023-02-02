# Neatbox Core

## Prerequisites

```sh
## Install system prerequisites
sudo apt update && sudo apt upgrade -y

sudo apt-get install git jq -y

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

source ~/.bashrc

nvm install v16.18.1

npm install --global lisk-commander pm2
```

## Installation

```sh
## Install Neatbox Core
git clone https://github.com/enricozanardo/neatbox-core
cd neatbox-core
npm i
```

## Start the Neatbox Core node

```sh
## In terminal
cd ~/neatbox-core
npm start

## As PM2 process
cd ~/neatbox-core
pm2 start npm --name "neatbox-core" -- run start

## PM2 logs
pm2 log
```
