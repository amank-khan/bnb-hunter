#!/usr/bin/env bash

apt update
apt install -y curl wget nano neofetch git

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 24.22.3

nvm use 24.22.3

git clone https://github.com/amank-khan/bnb-hunter.git

cd bnb-hunter

npm install

npm start
