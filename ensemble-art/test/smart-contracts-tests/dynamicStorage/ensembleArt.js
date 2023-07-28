const truffleAssert = require("truffle-assertions");
const EnsembleArt = artifacts.require('EnsembleArt');

function testTime(min) {
    let dateInSecs = Math.floor(new Date().getTime() / 1000);
    const addMin =  min * 60
    dateInSecs += addMin
    return dateInSecs;
}

function hashMessage(address, account, timestamp, rule) {
    return web3.utils.soliditySha3(address,account,timestamp, rule);
}


contract('Ensemble Art', function(accounts) {
    let ensembleArt = null;
    let contractAddress, signer, randomSigner, signer_role;

    const owner = accounts[0];
    const userA = accounts[1];
    const userB = accounts[2];
    const tokenURI = "ipfs://some_uri/";
    const timestamp = testTime(0);

    const locationProp = {
        colorSelection: 3,
        shapeSelection: 4,
        shapeDistribution: 8,
        numberOfShapes: 4
    }

    before(async () => {
        ensembleArt = await EnsembleArt.deployed();
        contractAddress = ensembleArt.address;
        randomSigner = await web3.eth.accounts.create();
        await ensembleArt.unpause();

        signer = await web3.eth.accounts.create();
        signer_role = await ensembleArt.SIGNER_ROLE();
        await ensembleArt.grantRole(signer_role, signer.address);
    });

    it("should fail to mint with invalid location rules id", async ()=> {
        const locationRuleId = 34;
        const minter = (await web3.eth.accounts.create()).address;
        const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
        const signature = signer.sign(hash);

        const mintRequest = {
            signature: signature.signature,
            timestamp: timestamp,
            receiver: minter,
            tokenURI: tokenURI
        }

        await truffleAssert.fails(
          ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
              value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "Rule Id is from 1 to 3"
        );
    });

    it("should fail to mint with wrong signature", async ()=> {
        const locationRuleId = 34;
        const minter = (await web3.eth.accounts.create()).address;
        //signer = await web3.eth.accounts.create();
        const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
        const signature = randomSigner.sign(hash);

        const mintRequest = {
            signature: signature.signature,
            timestamp: timestamp,
            receiver: minter,
            tokenURI: tokenURI
        }

        await truffleAssert.fails(
          ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
              from:userA, value: web3.utils.toWei('0.001',"ether")
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
            tokenURI: tokenURI
        }

        await ensembleArt.setMaxLocationRules(1);
        const tx = await ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
            value: web3.utils.toWei('0.001',"ether")
        })
        const minterBalance = await ensembleArt.balanceOf(minter);
        expect(minterBalance.toNumber()).to.equal(1);

        truffleAssert.eventEmitted(tx, 'MintLocation', event => {
            return (
              event.tokenId > 0
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
            tokenURI: tokenURI
        }

        await truffleAssert.fails(
          ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
              from:owner, value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "revert All locations exhausted"
        );
    })

    it("should fail to mint more that max mint amount ", async () => {
        let locationRuleId = 2;
        const minter = (await web3.eth.accounts.create()).address;

        let hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
        let signature = signer.sign(hash);

        let mintRequest = {
            signature: signature.signature,
            timestamp: timestamp,
            receiver: minter,
            tokenURI: tokenURI
        }

        await ensembleArt.setMaxLocationRules(1);
        await ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
            value: web3.utils.toWei('0.001',"ether")
        })

        locationRuleId = 3;
        hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
        signature = signer.sign(hash);
        mintRequest = {
            signature: signature.signature,
            timestamp: timestamp,
            receiver: minter,
            tokenURI: tokenURI
        }
        await truffleAssert.fails(
          ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
              from:owner, value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "revert Max mint amount exceeded"
        );
    })

    it("should fetch NFT data from tokenId", async function() {
        const locationRuleId = 3;
        const minter = (await web3.eth.accounts.create()).address;

        const hash = hashMessage(contractAddress, minter, timestamp, locationRuleId);
        const signature = signer.sign(hash);

        const mintRequest = {
            signature: signature.signature,
            timestamp: timestamp,
            receiver: minter,
            tokenURI: tokenURI
        }

        await ensembleArt.setMaxLocationRules(1);
        let expectedLocationRuleLength = await ensembleArt.getLocationRuleSize(locationRuleId);
        expect(expectedLocationRuleLength.toNumber()).to.equal(0);

        const tx = await ensembleArt.mintWithLocationRules(locationRuleId, locationProp, mintRequest, {
            from:userB, value: web3.utils.toWei('0.001',"ether")
        })


        expectedLocationRuleLength = await ensembleArt.getLocationRuleSize(locationRuleId);
        expect(expectedLocationRuleLength.toNumber()).to.equal(1);

        const tokenId = tx.logs[2].args.tokenId.toString();
        const tokenLocationRule = await ensembleArt.getTokenLocationRule(tokenId);
        expect(tokenLocationRule.locationRuleId.toNumber()).to.equal(locationRuleId);
        expect(tokenLocationRule.locationRuleIndex.toNumber()).to.equal(expectedLocationRuleLength - 1);

        const _locationProp = await ensembleArt.getTokenLocationProp(
          locationRuleId,
          tokenLocationRule.locationRuleIndex
        );

        expect(parseInt(_locationProp.shapeSelection)).to.equal(locationProp.shapeSelection);
        expect(parseInt(_locationProp.colorSelection)).to.equal(locationProp.colorSelection);
        expect(parseInt(_locationProp.numberOfShapes)).to.equal(locationProp.numberOfShapes);
        expect(parseInt(_locationProp.shapeDistribution)).to.equal(locationProp.shapeDistribution);
    })
});


