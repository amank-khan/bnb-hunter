
#!/usr/bin/env bash
set -e

echo "================================"
echo " BNB Hunter Installation"
echo "================================"

# Update dan install dependencies
apt update
apt install -y curl wget nano neofetch git

# Install NVM
export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Install Node.js
nvm install 24.22.3
nvm use 24.22.3

# Clone repository
if [ ! -d "bnb-hunter" ]; then
    git clone https://github.com/amank-khan/bnb-hunter.git
else
    echo "Repository bnb-hunter sudah tersedia."
fi

echo "================================"
echo " Installation completed!"
echo "================================"

