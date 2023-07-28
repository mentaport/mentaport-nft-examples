const truffleAssert = require("truffle-assertions");
const MentaportMintContract = artifacts.require('MentaportMint');

function testTime(min) {
    var dateInSecs = Math.floor(new Date().getTime() / 1000);
    const addMin =  min * 60
    dateInSecs += addMin
    return dateInSecs;
}

function hashMessage(address, account, timestamp, rule) {
    const hashedMessage = web3.utils.soliditySha3(address,account,timestamp, rule);
    return hashedMessage;
}

contract('MentaportMint - signature tests', function(accounts) {
    let instance;
    let contractAddress;
    let mintAmount = 1;
    const tokenPath = "ipfs://somepath/"
    
    const owner = accounts[0];
    const userA = accounts[1];
    const userB = accounts[2];
    const timestamp = testTime(0);
    
    before(async () => {
        instance =  await MentaportMintContract.deployed();
        contractAddress = instance.address;
        await instance.unpause();

        signer = await web3.eth.accounts.create();
    });
   
    it('should fail to execute mint functions if mint rules are enabled', async() => {
        await truffleAssert.fails(
          instance.mint(mintAmount, { value: web3.utils.toWei('0.001',"ether") }),
          truffleAssert.ErrorType.REVERT,
          "Failed using mint rules, use mintMenta."
        );
    });

    it('should fail to mint with wrong hash', async() => {
        const rule = 0;
        const hash = hashMessage('some random account',userB, timestamp, rule);
        const signature = signer.sign(hash);

        await truffleAssert.fails(
          instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {
              value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "revert Wrong signature"
        );
    });

    it('should fail mint with the wrong signer', async() => {
        const rule = 0;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);
        await truffleAssert.fails(
          instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {
              value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "Wrong signature"
        );
    });

    it('should fail to mint with the wrong signer role assignment', async() => {
        const signer_role = await instance.SIGNER_ROLE();
        await truffleAssert.fails(
          instance.grantRole(signer_role, signer.address),
          truffleAssert.ErrorType.REVERT,
          "missing role"
        );
    });

    it('should mint with correct hash and signer', async() => {
        const rule = 0;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);
        const tokenURL = tokenPath + "12334/metadata.json"

        const signer_role = await instance.SIGNER_ROLE();
        await instance.grantRole(signer_role, signer.address, {from:userA});

        const mint = await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {
            value: web3.utils.toWei('0.001',"ether")
        });
        expect(mint.receipt.status).to.be.true;
    });

    it('should fail to mint if signature is already used', async() => {
        const rule = 0;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);
        const tokenURL = tokenPath + "12334/metadata.json"
        await truffleAssert.fails(
          instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {
              value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "revert Signature already used"
        );
    });

    it('should mint with a valid unused signature', async() => {
        const rule = 1;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);
        const tokenURL = tokenPath + "45678/metadata.json"

        const signer_role = await instance.SIGNER_ROLE();
        await instance.grantRole(signer_role, signer.address, {from:userA});
        const mint = await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {
            value: web3.utils.toWei('0.001',"ether")
        });
        expect(mint.receipt.status).to.be.true;
    });

    it('should fail to mint when sender is not signer', async() => {
        const rule = 2;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);

        await truffleAssert.fails(
          instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {
              from:userA, value: web3.utils.toWei('0.001',"ether")
          }),
          truffleAssert.ErrorType.REVERT,
          "revert Wrong signature"
        );
    });

    it('should mint when sender is signer', async() => {
        const rule = 2;
        const hash = hashMessage(contractAddress, userA, timestamp, rule);
        const signature = signer.sign(hash);

        const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {
            from:userA, value: web3.utils.toWei('0.001',"ether")
        });
        expect(mint.receipt.status).to.be.true;
    });
});


