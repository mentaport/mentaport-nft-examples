# Mentaport NFT examples

This repository contains example integrations with Mentaport's SDK and various Web3 environments. This repo
currently contains two example contracts `ensemble-art-eth` and `stamps-polygon` which show how to integrate
with Mentaport's contracts to achieve on-chain location-aware smart contracts. More information will be
provided about these contracts below.

### Ensemble Art Eth
`ensemble-art-eth` is an example contract that extends Mentaport's base contracts with additional features for
minting NFT's with location properties and location rules. The `EnsembleArt` contract extends 
`MentaportMint` from  the SDK which allows it so initialize key variables such as the `minter`, `owner`, and 
`signer` in the `Ensemble smart` contract. The `MentaportMint` contract also exposes other functions like 
`mintLocation` which can be overridden with custom logic to suit the purpose of your application.

[https://enseble.mentaport.xyz](https://ensemble.mentaport.xyz)

### Stamps Polygon
`stamps-polygon` is an example contract that extends Mentaport's base contracts that shows how to use more 
fine-grained controls for minting location-aware NFTs. The `MentaportStamps` extends other Mentaport base
contracts, allowing it to have more control over setting roles, rules, etc. 

[https://stamps.mentaport.xyz](https://stamps.mentaport.xyz)

### Setup
Follow these stops to setup and test the contracts:

cd into the example directory:
```shell
cd mentaport-nft-examples\{example_folder}
```

install example dependencies
```shell
yarn install
```

test the exmaples
```shell
truffle test
```

