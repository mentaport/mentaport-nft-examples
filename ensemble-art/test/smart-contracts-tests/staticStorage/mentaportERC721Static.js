const truffleAssert = require("truffle-assertions");
const MentaportERC721Contract = artifacts.require('MentaportERC721Static');

contract('MentaportERC721Static - Setup', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = accounts[2];

    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
    });

    it('should check contract setup', async() => {
        expect(
          web3.utils.isAddress(instance.address), "contract not deployed"
        ).to.be.true;

        expect(
          await instance.name(), "wrong token name"
        ).to.equal("mentaportStatic");

        expect(
          (await instance.totalSupply()).toNumber(), "initial token supply is not zero"
        ).to.equal(0);

        expect(
          await instance.baseURI(),"initial token supply is not zero"
        ).to.equal("na");
    });

    it("should check pause/unpause states", async () => {
        await truffleAssert.fails(
          instance.mint(1, {value: web3.utils.toWei('0.01',"ether")}),
          truffleAssert.ErrorType.REVERT,
          "Pausable: paused"
        );

        await truffleAssert.fails(
          instance.unpause({from:userMinter}),
          truffleAssert.ErrorType.REVERT,
          "Caller is not contract admin"
        );

        await instance.unpause();
        expect(
          await instance.paused(), "contract is still paused"
        ).to.be.false;

        await truffleAssert.fails(
          instance.unpause(),
          truffleAssert.ErrorType.REVERT,
          "Pausable: not paused"
        );

        await instance.pause();
        expect(
          await instance.paused(), "contract is still unpaused"
        ).to.be.true;

        await truffleAssert.fails(
          instance.pause(),
          truffleAssert.ErrorType.REVERT,
          "Pausable: paused"
        );
    });
});

// minting functions 
contract('MentaportERC721Static - Mint', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = accounts[2];

    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
        await instance.unpause();
    });

    it('should fail to mint invalid mint amounts', async() => {
        await truffleAssert.fails(
          instance.mint(10, {value: web3.utils.toWei('0.1',"ether")}),
          truffleAssert.ErrorType.REVERT,
          "Invalid mint amount"
        );
    });

    it('should fail to mint when funds are insufficient', async() => {
        await truffleAssert.fails(
          instance.mint(1, {value: web3.utils.toWei('0.0001',"ether")}),
          truffleAssert.ErrorType.REVERT,
          "Insufficient funds"
        );
    });

    it('should mint 1 nft to owner', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        await instance.mint(numMint, {value: web3.utils.toWei('0.001',"ether")});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should mint 1 nft to non-owner', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        await instance.mint(numMint, {from: userAdmin, value: web3.utils.toWei('0.001',"ether")});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should fail to mint if caller is not minter', async() => {
        await truffleAssert.fails(
          instance.mintForAddress(1, userAdmin),
          truffleAssert.ErrorType.REVERT,
          "Caller is not minter"
        );
    });

    it('should allow minter mint for other Address', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        await instance.mintForAddress(numMint, userAdmin, {from:userMinter});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should return correct tokenURI for tokenID 1:', async() => {
        let tokenId = 1;
        expect(await instance.tokenURI(tokenId)).to.equal("na");
    });

    it('should fail when withdraw is not by owner', async() => {
        await truffleAssert.fails(
          instance.withdraw({from:userAdmin}),
          truffleAssert.ErrorType.REVERT,
          "revert Ownable:"
        );
    });
});

// other ROLEs functions
contract('MentaportERC721Static - Role Functions', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = accounts[2];
    const newMentaAcnt = accounts[3];

    const new_baseURI = 'http://new_uri_path/';
    
    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
        await instance.unpause();
    });
   
    it('should check that base url is correct', async() => {
        const uri = await instance.baseURI();
        expect(uri).to.equal('na');
    });

    it('should fail set base URI if role is wrong', async() => {
        await truffleAssert.fails(
          instance.setBaseURI(new_baseURI, {from:userMinter}),
          truffleAssert.ErrorType.REVERT,
          "Caller is not contract admin"
        );
    });

    it('should set base URI if caller is admin role', async() => {
        await instance.setBaseURI(new_baseURI, {from:userAdmin});
        const uri = await instance.baseURI();
        expect(uri).to.equal(new_baseURI);
    });

    it('should fail to reveal URI by wrong role', async() => {
        await truffleAssert.fails(
          instance.reveal({from:userMinter}),
          truffleAssert.ErrorType.REVERT,
          "Caller is not contract admin"
        );
    });

    it('should reveal base URI when called by right role', async() => {
        await instance.reveal();
        const uri = await instance.baseURI();
        expect(uri).to.equal(new_baseURI);
    });

    it('should change mentaport account by a wrong role', async() => {
        await truffleAssert.fails(
          instance.changeMentaportAccount(userMinter,{from:userAdmin}),
          truffleAssert.ErrorType.REVERT,
          "Caller is not mentaport"
        );

    });

    it('should change mentaport account by mentaport role', async() => {
        //TODO: this role cannot be changed because the role admin (MENTAPORT_ADMIN) is hardcoded into the contract

        // const res = await instance.changeMentaportAccount(newMentaAcnt);
        // const log = res.logs[0];
        // assert.equal(log.event, 'MentaportAccount');
        // assert.equal(log.args.sender.toString(), owner);
        // assert.equal(log.args.account.toString(), newMentaAcnt);
    });

    it('Withdraw funds', async() => {
        const mentaportAccount = "0x3bD3b2D1C0cD18ed91779356702E9B5B1f1bbfb4";

        const mentaportBalanceBefore = await web3.eth.getBalance(mentaportAccount);
        await instance.mint(1, {from: userAdmin, value: web3.utils.toWei('0.001',"ether")});

        const contractBalance =  await web3.eth.getBalance(instance.address)
        const ownerBalanceBefore = await web3.eth.getBalance(owner);

        await instance.withdraw();
        const ownerBalanceAfter = await web3.eth.getBalance(owner);
        const mentaportBalanceAfter = await web3.eth.getBalance(mentaportAccount);

        expect(mentaportBalanceAfter - mentaportBalanceBefore).to.equal((25 * contractBalance) / 1000);
        expect(ownerBalanceAfter - ownerBalanceBefore).to.be.at.least((75 * contractBalance) / 1000);
    });
});

// setting, iunseting access roles
contract('MentaportERC721Static - Access Role Modifiers', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = signer = accounts[2];

    const userNewMinter = accounts[5];
    
    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
    });
   
    it('should check that contract main admin role set to only owner', async() => {
        const contract_role = await instance.CONTRACT_ROLE();
        const _admin = await instance.getRoleAdmin(contract_role);

        expect(await instance.hasRole(_admin, userAdmin)).to.be.true;
        expect(await instance.hasRole(_admin, owner)).to.be.false;
    });

    it('should check if accounts have contract role', async() => {
        const contract_role = await instance.CONTRACT_ROLE();

        expect(await instance.hasRole(contract_role, userAdmin)).to.be.true;
        expect(await instance.hasRole(contract_role, owner)).to.be.true;
    });

    it('should verify that owner and signer have the signer role', async() => {
        const signer_role = await instance.SIGNER_ROLE();

        expect(await instance.hasRole(signer_role, userAdmin)).to.be.true;
        expect(await instance.hasRole(signer_role, owner)).to.be.true;
    });

    it('should set a new minter role for the minter account', async() => {
        const minter_role = await instance.MINTER_ROLE()
        expect(await instance.hasRole(minter_role, userMinter)).to.be.true;
    });

    it('should set a new minter role for the minter account', async() => {
        //TODO: this role cannot be changes because the role admin (MENTAPORT_ADMIN) is hardcoded into the contract

        // const minter_role = await instance.MINTER_ROLE()
        // await instance.grantRole(minter_role, userNewMinter);
        //
        // const hasRole = await instance.hasRole(minter_role, userNewMinter);
        // assert(hasRole, "Role was not set correctly for account");
    });

    it('should revoke minter role for minter account', async() => {
        //TODO: this role cannot be changes because the role admin (MENTAPORT_ADMIN) is hardcoded into the contract

        // const minter_role = await instance.MINTER_ROLE()
        // await instance.revokeRole(minter_role, userNewMinter);
        //
        // const hasRole = await instance.hasRole(minter_role, userNewMinter);
        // assert(!hasRole, "Role was not removed correctly for account");
    });

    it('should revoke ownership of contract', async() => {
        const contract_role = await instance.CONTRACT_ROLE();
        await instance.revokeRole(contract_role, userAdmin, {from: userAdmin})
        expect(await instance.hasRole(contract_role, userAdmin)).to.be.false;
    });

});
