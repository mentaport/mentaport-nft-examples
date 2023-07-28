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

const contractAddress = '0x5Af656885Be201e2A59278e05Ed3bF4156556071';
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
  const zeroDevSigner = await getZeroDevSigner({
    projectId,
    owner: wallet,
    bundlerGasCalculation: true,
    paymasterProvider: "ALCHEMY"
  })

  const locationRuleId = 1;
  const tokenURI = "ipfs://some_uri/";
  const minter = (new Accounts()).create("minter_address")
  const signer = (new Accounts()).create("test_address");

  const timestamp = testTime(1);
  const hash = hashMessage(contractAddress, minter.address, timestamp, locationRuleId);
  const signature = signer.sign(hash);

  const nftContract = new Contract(contractAddress, contractABI, wallet)
  const signer_role = await nftContract.SIGNER_ROLE();
  const hasRole = await nftContract.hasRole(signer_role, signer.address);
  if(!hasRole){
    await nftContract.grantRole(signer_role, signer.address);
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

  const receipt = await zeroDevSigner.execBatch([{
    to: nftContract.address,
    data: nftContract.interface.encodeFunctionData("mintWithLocationRules", [
      locationRuleId, locationProp, mintRequest
    ]),
    value: utils.parseEther('0.001').toHexString()
  }], {
    gasLimit: 400000,
  });
  const tx = await receipt.wait();
  console.log(tx)
}

main().then(() => process.exit(0))
