const Web3 = require("web3");
const truffleAssert = require("truffle-assertions");
const MentaportERC721Contract = artifacts.require('MentaportERC721');

contract('MentaportERC721 - Setup', function(accounts) {
    let instance = null;
    const userMinter = accounts[2];
    const tokenPath = 'ipfs://somepath/'

    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
    });
 
    it('should check contract setup', async() => {
        expect(
          web3.utils.isAddress(instance.address), "contract not deployed"
        ).to.be.true;

        expect(
          await instance.name(), "wrong token name"
        ).to.equal("mentaport");

        expect(
          (await instance.totalSupply()).toNumber(), "initial token supply is not zero"
        ).to.equal(0);
    });

    it("should check pause/unpause states", async () => {
        await truffleAssert.fails(
          instance.mint(tokenPath, {value: web3.utils.toWei('0.01',"ether")}),
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

contract('MentaportERC721 - Mint', function(accounts) {
    let instance = null;
    const userAdmin = accounts[1];
    const userMinter = accounts[2];
    const tokenPath = 'ipfs://somepath/'

    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
        await instance.unpause();
    });

    it('should fail to mint when funds are insufficient', async() => {
        await truffleAssert.fails(
          instance.mint(tokenPath, {value: web3.utils.toWei('0.0001',"ether")}),
          truffleAssert.ErrorType.REVERT,
          "Insufficient funds"
        );
    });

    it('should mint 1 nft to owner', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        const tokenURL = tokenPath + "12334/metadata.json"
        await instance.mint(tokenURL, {value: web3.utils.toWei('0.001',"ether")});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should mint 1 nft to non-owner', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        const tokenURL = tokenPath + "456789/metadata.json"
        await instance.mint(tokenURL, {from: userAdmin, value: web3.utils.toWei('0.001',"ether")});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should fail to mint if caller is not minter', async() => {
        await truffleAssert.fails(
          instance.mintForAddress(tokenPath, userAdmin),
          truffleAssert.ErrorType.REVERT,
          "Caller is not minter"
        );
    });

    it('should allow minter mint for other Address', async() => {
        const numMint = 1;
        const currentSupply = (await instance.totalSupply()).toNumber();
        const tokenURL = tokenPath + "09876/metadata.json"
        await instance.mintForAddress(tokenURL, userAdmin, {from:userMinter});
        const totalSupply = (await instance.totalSupply()).toNumber();
        expect(currentSupply + numMint).to.equal(totalSupply);
    });

    it('should return correct tokenURI for tokenID 0:', async() => {
        let tokenId = 0;
        const expectedtokenUrl = tokenPath + "12334/metadata.json"
        expect(await instance.tokenURI(tokenId)).to.equal(expectedtokenUrl);
    });

    it('should return correct tokenURI for tokenID 1:', async() => {
        let tokenId = 1;
        const expectedtokenUrl = tokenPath + "456789/metadata.json"
        expect(await instance.tokenURI(tokenId)).to.equal(expectedtokenUrl);
    });

    it('should fail when withdraw is not by owner', async() => {
        await truffleAssert.fails(
          instance.withdraw({from:userAdmin}),
          truffleAssert.ErrorType.REVERT,
          "revert Ownable:"
        );
    });
});

contract('MentaportERC721 - Role Functions', function(accounts) {
    let instance, web3;
    const owner = accounts[0];
    const userAdmin = accounts[1];
    const userMinter = accounts[2];
    const mentaportAccount = "0x6a9b1C4742ee05701048e03149c2288b34AA1600";

    before(async () => {
        web3 = new Web3(Web3.givenProvider);
        instance =  await MentaportERC721Contract.deployed();
        await instance.unpause();
    });
   
    it('should fail when unauthorized called tries to change mentaport account', async() => {
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

    it('should withdraw rewards', async() => {
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

contract('MentaportERC721 - Access Role Modifiers', function(accounts) {
    let instance = null;
    const owner = accounts[0];
    const admin = accounts[1];
    const minter = signer = accounts[2];

    const userNewMinter = accounts[5];
    
    before(async () => {
        instance =  await MentaportERC721Contract.deployed();
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
        //TODO: this role cannot be changes because the role admin (MENTAPORT_ADMIN) is hardcoded into the contract

        const minter_role = await instance.MINTER_ROLE()
        // await instance.grantRole(minter_role, userNewMinter, {from: admin});
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
        await instance.revokeRole(contract_role, admin, {from: admin})
        expect(await instance.hasRole(contract_role, admin)).to.be.false;
    });
});
