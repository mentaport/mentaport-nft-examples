const truffleAssert = require("truffle-assertions");
const EnsembleArt = artifacts.require('EnsembleArt');

function testTime(min) {
  let dateInSecs = Math.floor(new Date().getTime() / 1000);
  const addMin =  min * 60
  dateInSecs += addMin
  return dateInSecs;
}

//TODO: figure out how this runs with the admin set to tha different address

function hashMessage(address, account, timestamp, rule) {
  return web3.utils.soliditySha3(address,account,timestamp, rule);
}

const COLOR_NAMES_E = ['Mastic','Rouge','Lavande','Indigo', 'Doré'];
const COLOR_NAMES_C = ['Ambre','Orange brûlée','Mastic','Bourgogne','Doré'];
const COLOR_NAMES_B = ['Turquoise','Bleu sarcelle','Lavande','Mastic','Doré'];

const SHAPE_NAMES_E = ['Pixel','Petit fleur','Fleur'];
const SHAPE_NAMES_C = ['Pixel','Petit crâne', 'Crâne'];
const SHAPE_NAMES_B = ['Pixel','Petit aile','Aile'];

function GetColorNames(rule, index) {
  if(rule == 2) {
    return COLOR_NAMES_B[index]
  }
  if(rule == 3) {
    return COLOR_NAMES_C[index]
  }
  return COLOR_NAMES_E[index]
}

function GetShapeNames(rule, index) {
  if(rule == 2) {
    return SHAPE_NAMES_B[index]
  }
  if(rule == 3) {
    return SHAPE_NAMES_C[index]
  }
  return SHAPE_NAMES_E[index]
}

contract('Ensemble Art', function(accounts) {
  let ensembleArt = null, mintForAddress , signer;
  let contractAddress

  let owner = accounts[0];
  let admin = accounts[1];
  let minter = accounts[2];
  let userB = accounts[3];

  const tokenURI = "ipfs://some_uri/";
  const timestamp = testTime(0);

  const locationProp = {
    colorSelection: 3,
    shapeSelection: 0,
    numberOfShapes: 4
  }

  const locationProp_1 = {
    colorSelection: 0,
    shapeSelection: 1,
    numberOfShapes: 4
  }
  before(async () => {
  
    ensembleArt =  await EnsembleArt.deployed();

    contractAddress = ensembleArt.address;
    signer = await web3.eth.accounts.create();
    signer_role = await ensembleArt.SIGNER_ROLE();
    await ensembleArt.grantRole(signer_role, signer.address,{from: admin});

    await ensembleArt.unpause();

    mintForAddress = ensembleArt.methods[
      "mintForAddress((uint8,uint8,uint256),(bytes,uint256,uint256,address,string))"
    ];
  });

  it('should fail to mint nft with location because overwitten to use `mintWithLocationProps`', async() => {  
  
    const locationRuleId = 1;
    const timestamp = testTime(0);
    const receiver = (await web3.eth.accounts.create()).address;
    const hash = hashMessage(contractAddress, receiver, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      locationRuleId: locationRuleId,
      timestamp: timestamp,
      receiver: receiver,
      tokenURI: tokenURI,
    }
    await truffleAssert.fails(
      ensembleArt.mintLocation(mintRequest, {value: web3.utils.toWei('0.001',"ether")}),
      truffleAssert.ErrorType.REVERT,
      "Failed function not active, use mintWithLocationProps."
    );
  });

  it("should fail to mint with invalid location rules id", async ()=> {
    const locationRuleId = 34;
    const tempUser = (await web3.eth.accounts.create()).address;
    const hash = hashMessage(contractAddress, tempUser, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: tempUser,
      tokenURI: tokenURI,
      locationRuleId
    }

    await truffleAssert.fails(
      ensembleArt.mintWithLocationProps(locationProp, mintRequest, {
        value: web3.utils.toWei('0.001',"ether")
      }),
      truffleAssert.ErrorType.REVERT,
      "locationRuleId passed not active"
    );
  });

  it("should fail to mint with wrong signature", async ()=> {
    const locationRuleId = 2;
    const tempUser = (await web3.eth.accounts.create()).address;
    let randomSigner = await web3.eth.accounts.create();
    const hash = hashMessage(contractAddress, tempUser, timestamp, locationRuleId);
    const signature = randomSigner.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: tempUser,
      tokenURI: tokenURI,
      locationRuleId
    }

    await truffleAssert.fails(
      ensembleArt.mintWithLocationProps(locationProp, mintRequest, {
          from: userB, value: web3.utils.toWei('0.001',"ether")
      }),
      truffleAssert.ErrorType.REVERT,
      "revert Invalid signer"
    );
  });

  it("should mint with right location rule Id", async ()=> {
    const locationRuleId = 1;
    const minter = (await web3.eth.accounts.create()).address;
    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }

    await ensembleArt.setMaxLocationRules(1);
    const tx = await ensembleArt.mintWithLocationProps( locationProp, mintRequest, {
      value: web3.utils.toWei('0.001',"ether")
    })
    const minterBalance = await ensembleArt.balanceOf(minter);
    expect(minterBalance.toNumber()).to.equal(1);

    truffleAssert.eventEmitted(tx, 'MintLocation', event => {
      return (
        event.tokenId.toNumber() >= 0
      );
    });
  })

  it("should fail to mint more that max location rules ", async () => {
    const locationRuleId = 1;
    const minter = (await web3.eth.accounts.create()).address;
    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }

    await truffleAssert.fails(
      ensembleArt.mintWithLocationProps(locationProp, mintRequest, {
         value: web3.utils.toWei('0.001',"ether")
      }),
      truffleAssert.ErrorType.REVERT,
      "revert All locations exhausted"
    );
  })

  it("should fetch NFT locationRules data from tokenId", async function() {
    const locationRuleId = 3;
    const minter = (await web3.eth.accounts.create()).address;

    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }

    await ensembleArt.setMaxLocationRules(1);
    let expectedLocationRuleLength = await ensembleArt.getLocationRuleSize(locationRuleId);
    expect(expectedLocationRuleLength.toNumber()).to.equal(0);

    const tx = await ensembleArt.mintWithLocationProps(locationProp, mintRequest, {
      from:userB, value: web3.utils.toWei('0.001',"ether")
    })

    expectedLocationRuleLength = await ensembleArt.getLocationRuleSize(locationRuleId);
    expect(expectedLocationRuleLength.toNumber()).to.equal(1);

    const tokenId = tx.logs[2].args.tokenId.toString();
    const tokenLocationRule = await ensembleArt.getTokenLocationRule(tokenId);
    expect(tokenLocationRule.locationRuleId.toNumber()).to.equal(locationRuleId);
    expect(tokenLocationRule.locationRuleIndex.toNumber()).to.equal(expectedLocationRuleLength - 1);

    const _locationProp = await ensembleArt.getLocationPropByIndex(
      locationRuleId,
      tokenLocationRule.locationRuleIndex
    );

    expect(parseInt(_locationProp.shapeSelection)).to.equal(locationProp.shapeSelection);
    expect(parseInt(_locationProp.colorSelection)).to.equal(locationProp.colorSelection);
    expect(parseInt(_locationProp.numberOfShapes)).to.equal(locationProp.numberOfShapes);
  })
  it("should fetch NFT location props by tokenId", async function() {

    const locationRuleId = 1;
    await ensembleArt.setMaxLocationRules(10);
    const minter = (await web3.eth.accounts.create()).address;

    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }
    const tx = await ensembleArt.mintWithLocationProps(locationProp_1, mintRequest, {
      from:userB, value: web3.utils.toWei('0.001',"ether")
    })
    const tokenId = tx.logs[2].args.tokenId.toString();
    let _locationProp = await ensembleArt.getLocationPropByTokenId(tokenId);

    expect(parseInt(_locationProp.shapeSelection)).to.equal(locationProp_1.shapeSelection);
    expect(parseInt(_locationProp.colorSelection)).to.equal(locationProp_1.colorSelection);
    expect(parseInt(_locationProp.numberOfShapes)).to.equal(locationProp_1.numberOfShapes);
  })
  it("should fetch NFT location props names by tokenId", async function() {

    const locationRuleId = 1;
    await ensembleArt.setMaxLocationRules(10);
    const minter = (await web3.eth.accounts.create()).address;

    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }

    const tx = await ensembleArt.mintWithLocationProps(locationProp_1, mintRequest, {
      from:userB, value: web3.utils.toWei('0.001',"ether")
    })

    const tokenId = tx.logs[2].args.tokenId.toString();

    let _locationPropNames = await ensembleArt.getLocationPropValuesByTokenId(tokenId);

    expect(_locationPropNames.colorName).to.equal(GetColorNames(locationRuleId,locationProp_1.colorSelection));
    expect(_locationPropNames.shapeName).to.equal(GetShapeNames(locationRuleId,locationProp_1.shapeSelection));
  })

  it('should fail to `mintForAddress` if caller is not minter', async() => {
    const locationRuleId = 1;

    const hash = hashMessage(contractAddress, userB, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: userB,
      tokenURI: tokenURI,
      locationRuleId
    }

    const mintForAddress = ensembleArt.methods[
      "mintForAddress((uint8,uint8,uint256),(bytes,uint256,uint256,address,string))"
    ];
    await truffleAssert.fails(
      mintForAddress(locationProp, mintRequest, {from: userB}),
      truffleAssert.ErrorType.REVERT,
      "Caller is not minter"
    );
  });

  it('should allow `mintForAddress` if caller is minter', async() => {
    const locationRuleId = 1;
   
    const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
    const signature = signer.sign(hash);

    const mintRequest = {
      signature: signature.signature,
      timestamp: timestamp,
      receiver: minter,
      tokenURI: tokenURI,
      locationRuleId
    }

    ensembleArt = await EnsembleArt.deployed();
    mintForAddress = ensembleArt.methods[
      "mintForAddress((uint8,uint8,uint256),(bytes,uint256,uint256,address,string))"
    ];

    const currentSupply = (await ensembleArt.totalSupply()).toNumber();
    const tx = await mintForAddress(locationProp, mintRequest, {from: minter});
    const totalSupply = (await ensembleArt.totalSupply()).toNumber();
    expect(currentSupply + 1).to.equal(totalSupply);

    const tokenId = tx.logs[2].args.tokenId.toString();
    let _locationPropNames = await ensembleArt.getLocationPropValuesByTokenId(tokenId);

    expect(_locationPropNames.colorName).to.equal(GetColorNames(locationRuleId,locationProp.colorSelection));
    expect(_locationPropNames.shapeName).to.equal(GetShapeNames(locationRuleId,locationProp.shapeSelection));
  });
});


