const EnsembleArt = artifacts.require("EnsembleArt");

const max_supply = 500

module.exports = function (deployer, network, accounts) {
    const owner = accounts[0];
    const admin = accounts[1];
    const minter= accounts[2];
    const signer = accounts[2];

    const rule1 = 1;
    const rule2 = 2;
    const rule3 = 3;

    deployer.deploy(EnsembleArt,'Ensemble Art','ensemble', max_supply, admin, minter, signer, rule1, rule2, rule3);
};