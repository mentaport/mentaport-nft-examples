//const Contract = require ('./Contract.js');
const { Contract, Wallet, utils, providers} = require('ethers')
const Provider = require('@truffle/hdwallet-provider');

const config = require('config');

const EnsembleArt = require("../truffle/build/contracts/EnsembleArt.json");

const contractAddress_pasued = '0x55E7e1DE3FFA33f43740C592Bbc6032CAD60Fbc9';
const contractAddress = '0xcCf3621E609dE45d1230d23c02fd00f67Fa088C7';

const contractABI = EnsembleArt.abi;
const WEB3_PROVIDER_URL = config.get('Providers.mainnet.WEB3_PROVIDER_URL_eth');
const ALCHEMY_API_KEY  =  process.env.ALCHEMY_API_KEY; 

const OWNER_PK = process.env.MENTA_MAIN_PRIVATE_KEY; 
const OWNER_ADDR = process.env.MENTA_MAIN_PRIVATE_KEY; 

const ADMIN_PK = process.env.MENTA_MAIN_ADMIN_PRIVATE_KEY; 
const ADMIN_ADDR = process.env.MENTA_MAIN_ADMIN_PUBLIC_KEY; 

const MINTER_PK = process.env.MENTA_MAIN_ADMIN_PRIVATE_KEY; 
const MINTER_ADDR = process.env.MENTA_MAIN_ADMIN_PRIVATE_KEY; 

const MENTA_PK = process.env.MENTAPORT_MAIN_PRIVATE_KEY; 


//const provider = new Provider([OWNER_PK, ADMIN_PK], WEB3_PROVIDER_URL,0, 2); 

// const wallet = new Wallet(
//   OWNER_PK,
//   new providers.AlchemyProvider("mainnet",ALCHEMY_API_KEY)
// );



const mintint = async () => {
  
  // const wallet = new Wallet(
  //   OWNER_PK,
  //   new providers.AlchemyProvider("mainnet", process.env.ALCHEMY_API_KEY)
  // );
  const temp_sig="0xc0dd2ed3dce563cee981626ab34248c9632e1eabcb09c5f6a8258a95266528d66f2dbeb2c454e46d896cfb41fb0fe01817cd69c33a8cf2a3ab2dd8ccd64b247c1b"
  const wallet = new Wallet(
    OWNER_PK,
    new providers.InfuraProvider("mainnet", process.env.INFURA_API_KEY)
  );
  const nftContract = new Contract(contractAddress, contractABI, wallet)

  //var contract = await SetContract();

  const locationRuleId = 1;
  const tokenURI = "ipfs://QmSXEpqvzjySVhAEy2xEEbPad2iWm61vDWqVUZy9pYHDWL/metadata.json";
  const address = "0xF4e3E58BAB9BABfA4C85eff01f84c3A1DF526006";

  const locationProp = {
    colorSelection: 3,
    shapeSelection: 2,
    numberOfShapes: 5
  }

  const mintRequest = {
    signature: temp_sig,
    timestamp: 0,
    receiver: address,
    tokenURI: tokenURI,
    locationRuleId,
  }

  try {
    const mintForAddress = nftContract.functions[
    "mintForAddress((uint8,uint8,uint256),(bytes,uint256,uint256,address,string))"
  ];

  const mint = await mintForAddress(locationProp, mintRequest, {gasLimit: 300000});

  // const mint = await contract.nftContract.methods.mintForAddress(locationProp, mintRequest).send( {gasLimit: 400000});
   const tx = await mint.wait();

    console.log(tx)
    console.log(`NFT balance: ${await nftContract.balanceOf(address)}`)
  } catch(err) {
      console.log(err)
  }
  // const mintForAddress = nftContract.functions[
  //   "mintForAddress((uint8,uint8,uint256),(bytes,uint256,uint256,address,string))"
  // ];

  // const receipt = await mintForAddress(locationProp, mintRequest, {gasLimit: 400000});
  // // const receipt = await nftContract.mintWithLocationProps(locationProp, mintRequest, {
  // //   value: utils.parseEther('0.001').toHexString(),
  // //   gasLimit: 400000
  // // }) //0xda4cd8ca72cb47f50a4ffc75b0cef0af59912a37d2679acf1a90ae93bd27e63d

  // const tx = await receipt.wait();
  // console.log(`NFT balance: ${await nftContract.balanceOf(minter.address)}`)
  // console.log(tx)

}

async function SetContract() {
 
  var contract = new Contract(contractABI, contractAddress, provider)
  
  const name = await contract.ContractName();
  console.log(name)
  return contract;
}
const main = async () => {
  
  const wallet = new Wallet(
    MENTA_PK,
    new providers.InfuraProvider("mainnet", process.env.INFURA_API_KEY)
  );
  //CONTRACT_ADMIN
 
 const bad_wallet = '0x94c5D1D0E682ebEfcfFfeF1645f40947E572e54a'
  const nftContract = new Contract(contractAddress, contractABI, wallet)

  const minter_role = await nftContract.MINTER_ROLE();
  const admin_role = await nftContract.CONTRACT_ADMIN();

  const hasRole = await nftContract.hasRole(minter_role, OWNER_ADDR);
  console.log(hasRole)
  if(!hasRole){
   // await nftContract.grantRole(minter_role, OWNER_ADDR,{gasLimit: 400000} )
  }
//  const nftContract = new Contract(contractAddress, contractABI, provider)
  // const signer_role = await nftContract.SIGNER_ROLE();

  // const hasRole = await nftContract.hasRole(signer_role, signer.address);
  // if(!hasRole){
  //   await nftContract.grantRole(signer_role, signer.address);
  // }

  // if(isPaused) {
  //   await nftContract.unpause();
  // }

}

//main().then(() => process.exit(0))
mintint().then(() => process.exit(0))
