const EnsembleArt = artifacts.require("EnsembleArt");

module.exports = function (deployer, network, accounts) {
  const admin = accounts[0];
  const minter= accounts[0];
  const signer = admin;

  deployer.deploy(EnsembleArt,'EnsembleArt','EnsembleArt', 300, admin, minter, signer);
};

