const MentaportStampsContract = artifacts.require('MentaportStamps');

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
// initial test before any mint
contract('MentaportStamps', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = accounts[2];
    const tokenPath = 'ipfs://somepath/'

    before(async () => {
        instance =  await MentaportStampsContract.deployed();
    });
 
    it('should deploy contract', async() => {
        assert(instance.address != '');
    });
    it('should check contract setup', async() => {
        const tokenName = await instance.name();
        assert(tokenName == 'MentaportStamps');
    });
    it('should still have total supply 0', async() => {
        const totalSupply = await instance.totalSupply();
        assert(totalSupply == 0);
    });
    it('should faile because baseURI is not a function', async() => {
        try {
            const uri = await instance.baseURI();
            assert(uri == 'na');
        } catch (err) {
            assert.include(String(err), 'instance.baseURI is not a function');
        }
    });
    it('should fail to mint becasue contract is paused', async() => {
        try {
            const mint = await instance.mint(tokenPath, {value: web3.utils.toWei('0.01',"ether")});
            assert.fail(true, false, 'This function should throw an error because we havent unpaused the contract');
        } catch (err) {
            assert.include(String(err), 'Pausable: paused', 'Should be - The contract is paused!"');
        }
    });
    it('should fail to unpause contract from wrong role', async() => {
        try {
            await instance.unpause({from:userMinter});
            assert.fail(true, false, 'This function should throw an error because trying to unpause from wrong account');
        } catch (err) {
            assert.include(String(err), 'Caller is not contract admin', 'Should be  - Caller is not contract admin!');
        }
    });
    it('should unpause contract', async() => {
        await instance.unpause();
        const pp = await instance.paused();
        assert(pp == false);
    });
    it('should fail to unpause contract if already unpaused', async() => {
        try {
            await instance.unpause();
            assert.fail(true, false, 'This function should throw an error because the contract is not paused');
        } catch (err) {
            assert.include(String(err), 'Pausable: not paused', 'Should be  - Pausable: not paused!');
        }
    });
    it('should pause contract', async() => {
        await instance.pause();
        const pp = await instance.paused();
        assert(pp == true);
    });
    it('should fail to pause contract if already paused', async() => {
        try {
            await instance.pause();
            assert.fail(true, false, 'This function should throw an error because contract is already paused');
        } catch (err) {
            assert.include(String(err), 'Pausable: paused', 'Should be  - Pausable: paused!');
        }
    });
});

// mint menta rules check only location hash
contract('MentaportStamps - mint menta check', function(accounts) {
    let instance = null;
    let contractAddress;
    let signed = null;
    let numMint = 1;
    const timeRule = 0;
    const tokenPath = "ipfs://somepath/"
    
    const owner = accounts[0];
    const userA = accounts[1];
    const userB = accounts[2];
    const timestamp = testTime(0);
    
    before(async () => {
        instance =  await MentaportStampsContract.deployed();
        contractAddress = instance.address;
        await instance.unpause();

        signer = await web3.eth.accounts.create();
    });
   
    it('should fail to mint with normal mint function because using rules', async() => {
        try {
            const mint = await instance.mint(numMint, {value: web3.utils.toWei('0.00',"ether")});
            assert.fail(true, false, 'This function should throw an error because we are using mintMenta.');
        } catch (err) {
            assert.include(String(err), 'Failed using mint rules, use mintMenta.', 'Should be - Failed using mint rules, use mintMenta.');
        }
    });
    it('should fail to mint with wrong hash', async() => {
        try {
            const mintAmount = 1;
            const rule = 0;
            const hash = hashMessage('some random account',userB, timestamp, rule);
            const signature = signer.sign(hash);
            const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
         
            assert.fail(true, false, 'This function should throw an error because not right hash.');
        } catch (err) {
            assert.include(String(err), 'revert Wrong signature', 'Should be - Wrong signature');
        }
    });
    it('should fail to mint with correct hash but wrong signer', async() => {
        try {
            const mintAmount = 1;
            const rule = 0;
          
            const hash = hashMessage(contractAddress, owner, timestamp, rule);
            const signature = signer.sign(hash);
            const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
            
            assert.fail(true, false, 'This function should throw an error because not right signer role');
        } catch (err) {
            assert.include(String(err), 'revert Wrong signature', 'Should be - Wrong signature');
        }
    });
    it('should fail to mint with correct hash and wrong signer role', async() => {
        try {
            const mintAmount = 1;
            const rule = 0;
            const hash = hashMessage(contractAddress, owner, timestamp, rule);
            const signature = signer.sign(hash);
            // add signer to signer role
            const signer_role = await instance.SIGNER_ROLE();
            await instance.grantRole(signer_role, signer.address);
            const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
            
            assert.fail(true, false, 'This function should throw an error because not right admin to assign role');
        } catch (err) {
            assert.include(String(err), 'missing role', 'Should be - Account x missing role');
        }
    });
    it('should mint with mintMenta', async() => {
        const mintAmount = 1;
        const rule = 0;
        const hash = hashMessage(contractAddress, userB, timestamp, rule);
        const signature = signer.sign(hash);
        const tokenURL = tokenPath + "12334/metadata.json"
       
        // add signer to signer role
        const signer_role = await instance.SIGNER_ROLE();
        await instance.grantRole(signer_role, signer.address, {from:userA});
        const currentSupply = (await instance.totalSupply()).toNumber();
        await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {from:userB, value: web3.utils.toWei('0.00',"ether")});
        const totalSupply = (await instance.totalSupply()).toNumber();
    
        expect(currentSupply + 1).to.equal(totalSupply);
       
    });
    it('should fail to mint, signature already used', async() => {
        try {
            const mintAmount = 1;
            const rule = 0;
            const hash = hashMessage(contractAddress, owner, timestamp, rule);
            const signature = signer.sign(hash);
            const tokenURL = tokenPath + "12334/metadata.json"

            //  signer to signer role already added
            const mint1 = await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
            const mint = await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
          
            assert.fail(true, false, 'This function should throw an error because signature already used');
        } catch (err) {
          
            assert.include(String(err), 'revert Signature already used', 'Should be - Signature already used');
        }
    });
    it('should mint with new signature', async() => {
        const mintAmount = 1;
        const rule = 1;
        const hash = hashMessage(contractAddress, owner, timestamp, rule);
        const signature = signer.sign(hash);
        const tokenURL = tokenPath + "45678/metadata.json"

        // add signer to signer role
        const signer_role = await instance.SIGNER_ROLE();
        await instance.grantRole(signer_role, signer.address, {from:userA});
        const mint = await instance.mintMenta(tokenURL, rule, timestamp, signature.signature, {value: web3.utils.toWei('0.00',"ether")});
        assert(mint.receipt.status,"Mint didnt work");
    });
    it('should fail to mint with correct signer but wrong user calling mint', async() => {
        try {
            const mintAmount = 1;
            const rule = 2;
            const hash = hashMessage(contractAddress, owner, timestamp, rule);
            const signature = signer.sign(hash);
            //  signer to signer role already added
            const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {from:userA, value: web3.utils.toWei('0.00',"ether")});
            assert.fail(true, false, 'This function should throw an error because wrong signature');
        } catch (err) {
            assert.include(String(err), 'revert Wrong signature', 'Should be - Wrong signature');
        }
    });
    it('should mint with different user', async() => {
       
        const mintAmount = 1;
        const rule = 2;
        const hash = hashMessage(contractAddress, userA, timestamp, rule);
        const signature = signer.sign(hash);
        //  signer to signer role already added
       
        const mint = await instance.mintMenta(tokenPath, rule, timestamp, signature.signature, {from:userA, value: web3.utils.toWei('0.00',"ether")});
        
        assert(mint.receipt.status,"Mint didnt work");
    });
});


contract('MentaportStamps - Access Role Modifiers', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const admin = accounts[1];
    const minter = accounts[2];
    const signer = accounts[2];
    const userNewMinter = accounts[5];
    
    before(async () => {
        instance =  await MentaportStampsContract.deployed();
    });
   
    it('should check that contract main admin role set to only owner', async() => {
        const contract_role = await instance.CONTRACT_ROLE();
        const _admin = await instance.getRoleAdmin(contract_role);
    
        expect(await instance.hasRole(_admin, admin)).to.be.true;
        expect(await instance.hasRole(_admin, owner)).to.be.false;
      });
    
      it('should check if accounts have contract role', async() => {
        const contract_role = await instance.CONTRACT_ROLE();
    
        expect(await instance.hasRole(contract_role, admin)).to.be.true;
        expect(await instance.hasRole(contract_role, owner)).to.be.true;
      });
    
      it('should verify that owner and signer have the signer role', async() => {
        const signer_role = await instance.SIGNER_ROLE();

        expect(await instance.hasRole(signer_role, admin)).to.be.false;
        expect(await instance.hasRole(signer_role, owner)).to.be.true;
        expect(await instance.hasRole(signer_role, signer)).to.be.true;
      });
    
      it('should check if minter account has a minter role', async() => {
        const minter_role = await instance.MINTER_ROLE();
        expect(await instance.hasRole(minter_role, minter)).to.be.true;
      });
    
      it('should set a new minter role for the minter account', async() => {
        const minter_role = await instance.MINTER_ROLE()
        await instance.grantRole(minter_role, userNewMinter, {from: owner});
        const hasRole = await instance.hasRole(minter_role, userNewMinter);
        assert(hasRole, "Role was not set correctly for account");
      });
    
      it('should revoke minter role for minter account', async() => {
        const minter_role = await instance.MINTER_ROLE()
        await instance.revokeRole(minter_role, userNewMinter,{from: owner});
        
        const hasRole = await instance.hasRole(minter_role, userNewMinter);
        assert(!hasRole, "Role was not removed correctly for account");
      });
    
      it('should revoke ownership of contract', async() => {
        const contract_role = await instance.CONTRACT_ROLE();
        await instance.revokeRole(contract_role, admin, {from: admin})
        expect(await instance.hasRole(contract_role, admin)).to.be.false;
      });

});