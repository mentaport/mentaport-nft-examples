const { Contract, Wallet, utils, providers} = require('ethers')
const { getZeroDevSigner } = require('@zerodevapp/sdk')
const web3Utils = require("web3-utils");
const Accounts = require("web3-eth-accounts");


require('dotenv').config();
const projectId = process.env.PROJECT_ID
const wallet = new Wallet(
  process.env.PRIVATE_KEY,
  new providers.AlchemyProvider("goerli", process.env.ALCHEMY_API_KEY_TEST)
);

const EnsembleArt = require("../build/contracts/EnsembleArt.json");

const contractAddress = '0xe3057F675190994882505B536b7919c2ED22746E';
const contractABI = EnsembleArt.abi;
function hashMessage(address, account, timestamp, rule) {
  return web3Utils.soliditySha3(address,account,timestamp,rule)
}

function testTime(min) {
  var dateInSecs = Math.floor(new Date().getTime() / 1000);
  const addMin =  min * 60
  dateInSecs += addMin
  return dateInSecs;
}


const main = async () => {
  const minter = (new Accounts()).create("minter_address")
  const signer = (new Accounts()).create("singer_address");

  const locationRuleId = 1;
  const tokenURI = "ipfs://QmPJqLvXrUo6WUqMYy8VJ2fa5eMHCDttxhNozEkU8bpZuL/metadata.json";
  const timestamp = testTime(1);
  const hash = hashMessage(contractAddress, minter.address, timestamp, locationRuleId);
  const signature = signer.sign(hash);

  const nftContract = new Contract(contractAddress, contractABI, wallet)
  const signer_role = await nftContract.SIGNER_ROLE();

  const hasRole = await nftContract.hasRole(signer_role, signer.address);
  if(!hasRole){
    await nftContract.grantRole(signer_role, signer.address);
  }

  const isPaused = await nftContract.paused();
  if(isPaused){
    await nftContract.unpause();
  }

  const locationProp = {
    colorSelection: 3,
    shapeSelection: 4,
    shapeDistribution: 8,
    numberOfShapes: 4
  }

  const mintRequest = {
    signature: signature.signature,
    timestamp: timestamp,
    receiver: minter.address,
    tokenURI: tokenURI
  }

  const receipt = await nftContract.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
    value: utils.parseEther('0.001').toHexString(),
    gasLimit: 400000
  })

  const tx = await receipt.wait();
  console.log(`NFT balance: ${await nftContract.balanceOf(minter.address)}`)
  console.log(tx)

  const tokenId = 2//"107803339369350706100"; //tx.logs[1].args.tokenId.toString();
  const tokenLocationRule = await nftContract.getTokenLocationRule(tokenId);

  const _locationProp = await nftContract.getTokenLocationProp(
    tokenLocationRule.locationRuleId,
    tokenLocationRule.locationRuleIndex
  );

  const locationRuleLength = await nftContract.getLocationRuleSize(tokenLocationRule.locationRuleId);
  console.log(tokenId, tokenLocationRule, _locationProp, locationRuleLength)
}

main().then(() => process.exit(0))
