require('dotenv').config();

const MentaportStamps = artifacts.require("MentaportStamps");


const max_supply = 100000
module.exports = function (deployer, network, accounts) {

  const owner = accounts[0];
  const admin = accounts[1];
  const minter= accounts[2];
  const signer = accounts[2];


  deployer.deploy(MentaportStamps,'MentaportStamps','stamps', max_supply, admin,minter, signer);
};


