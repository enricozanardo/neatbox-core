# Neatbox Core

## Usage

### Requirements

- Ubuntu 22.04 (LTS)
- Node 18 (LTS)

### Setup

1. Install `nvm` (https://github.com/nvm-sh/nvm)

```sh
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

2. Install node and global packages

```sh
nvm install 18
npm install --global lisk-commander pm2
```

3. Install dependencies

```sh
sudo apt update
sudo apt install -y libtool automake autoconf curl build-essential python2-minimal
```

4. Clone and install Neatbox Core

```sh
git clone https://github.com/enricozanardo/neatbox-core
cd neatbox-core
npm ci
```

### Run dev server

```sh
npm run dev
```

### Run production build

```sh
npm run build
npm run start:testnet
# npm run start:mainnet

# Alternatively, run as PM2 process
npm run start:testnet:pm2
# npm run start:mainnet:pm2
```

## How to become a validator quick-start

> The following is summary of all necessary commands. For a more detailed step-by-step guide, please refer to the official documentation (https://lisk.com/documentation/run-blockchain/become-a-validator.html).

1. Run a Neatbox Core node that is sync with the network
2. Initialize a wallet using the Neatbox app
3. Create validator keys with your wallet's passphrase

```sh
./bin/run keys:create --output config/keys.json
```

4. Create the Register Validator transaction (replace fields with data from `keys.json`) and send the transaction that was returned in hex format

```sh
./bin/run transaction:create pos registerValidator 1100000000 --params='{"name":"john","generatorKey":"4a1d15e75e899983d3407de7e068c7e150a02ffae90a3af1b4dc64ba30e603ce","blsKey":"a04e2b420495da08775990bca5f89eede49309ca0da5ed62750e220f9982aec516d016294504c0f56187eac0f56cb3af","proofOfPossession":"8cf2e4242e528787461a471c2c5fcc7ef4c7aff6462d89b513b94b0065021f74f916795b52db1ff89e9cac2480a2d3c8044d797738ca65d7d1eb93e478aae9c3f682d8f68527c74ba3edbbc3325efcecf1633e4c1b24d3f18eadf600c3faa40d"}'
```

```sh
./bin/run transaction:send 0a04647...5a3f05
```

1. Verify that validator is registered successfully (replace address with your own)

```sh
./bin/run endpoint:invoke pos_getValidator '{ "address":"lsk72uoqu78vjxd2jxbhmcvn4wvk8mfztrnw4z65v"}' --pretty
```

7. Import the validator keys

```sh
./bin/run keys:import --file-path config/keys.json
```

8. Verify correct import

```sh
./bin/run endpoint:invoke generator_getAllKeys --pretty
```

9. Set the hash onion (replace address with your own)

```sh
./bin/run endpoint:invoke random_setHashOnion '{"address":"lsk72uoqu78vjxd2jxbhmcvn4wvk8mfztrnw4z65v"}'
```

10. Enable block generation (replace address with your own)

```sh
./bin/run generator:enable lsk72uoqu78vjxd2jxbhmcvn4wvk8mfztrnw4z65v --height=0 --max-height-generated=0 --max-height-prevoted=0
```

> Caution: These values are only used for the initial enabling. For most situations where you need to re-enable the generator, `--use-status-value` should be used. Please refer to the [the docs](https://lisk.com/documentation/run-blockchain/become-a-validator.html#how-to-enable-block-generation-for-the-first-time) for more info.

11. Create self-stake transaction (replace address with your own) and send the transaction that was returned in hex format

```sh
./bin/run transaction:create pos stake 10000000 --params='{"stakes": [{"validatorAddress":"lsk72uoqu78vjxd2jxbhmcvn4wvk8mfztrnw4z65v","amount":"100000000000"}]}'
```

```sh
./bin/run transaction:send 0a04647...5a3f05
```

12. Verify self-stake

```sh
./bin/run endpoint:invoke pos_getValidator '{ "address":"lsk72uoqu78vjxd2jxbhmcvn4wvk8mfztrnw4z65v"}' --pretty
```

Configuration is now complete and you should be forging within the next few rounds. Monitor the logs and `pos_getValidator` endpoint to verify that you are forging successfully.
