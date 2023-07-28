//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "../IMentaportERC721.sol";
import "../MentaportVerify.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/**                                            
       
             ___           ___           ___                         ___           ___         ___           ___                   
     /\  \         /\__\         /\  \                       /\  \         /\  \       /\  \         /\  \                  
    |::\  \       /:/ _/_        \:\  \         ___         /::\  \       /::\  \     /::\  \       /::\  \         ___     
    |:|:\  \     /:/ /\__\        \:\  \       /\__\       /:/\:\  \     /:/\:\__\   /:/\:\  \     /:/\:\__\       /\__\    
  __|:|\:\  \   /:/ /:/ _/_   _____\:\  \     /:/  /      /:/ /::\  \   /:/ /:/  /  /:/  \:\  \   /:/ /:/  /      /:/  /    
 /::::|_\:\__\ /:/_/:/ /\__\ /::::::::\__\   /:/__/      /:/_/:/\:\__\ /:/_/:/  /  /:/__/ \:\__\ /:/_/:/__/___   /:/__/     
 \:\~~\  \/__/ \:\/:/ /:/  / \:\~~\~~\/__/  /::\  \      \:\/:/  \/__/ \:\/:/  /   \:\  \ /:/  / \:\/:::::/  /  /::\  \     
  \:\  \        \::/_/:/  /   \:\  \       /:/\:\  \      \::/__/       \::/__/     \:\  /:/  /   \::/~~/~~~~  /:/\:\  \    
   \:\  \        \:\/:/  /     \:\  \      \/__\:\  \      \:\  \        \:\  \      \:\/:/  /     \:\~~\      \/__\:\  \   
    \:\__\        \::/  /       \:\__\          \:\__\      \:\__\        \:\__\      \::/  /       \:\__\          \:\__\  
     \/__/         \/__/         \/__/           \/__/       \/__/         \/__/       \/__/         \/__/           \/__/  
       
       
                                                      
**/

/** 
 * @title MentaportERC721
 * @dev Create a sample ERC721 standard token
 */
contract MentaportERC721Static is ERC721,MentaportVerify, Ownable, Pausable, ReentrancyGuard, IMentaportERC721  {
 
  using Strings for uint256;
  using Counters for Counters.Counter;

  uint256 public immutable maxSupply;
  uint256 public cost = 0.001 ether;
  uint256 public maxMintAmount = 2;

  string public notRevealedUri;
  string public baseURI;
  string public baseExtension = ".json";
  bool public revealed;

  address internal _mentaAccount = 0x3bD3b2D1C0cD18ed91779356702E9B5B1f1bbfb4;
  Counters.Counter internal _supply;

  // we intiate our contract with a hidden URI for our content to make sure we control the information at mint.
  constructor(
    string memory _name,
    string memory _symbol,
    string memory _initNotRevealedUri,
    uint256 _maxSupply,
    address _admin,
    address _minter,
    address _signer
  ) ERC721(_name, _symbol) {

    // Grant roles to specified accounts
    _setupRole(CONTRACT_ADMIN, _admin);
    _setupRole(CONTRACT_ROLE, _admin);
    _setupRole(CONTRACT_ROLE, msg.sender); 

    _setupRole(MINTER_ROLE, _minter);
    // ccontract owner and _signer can sign contracts
    _setupRole(SIGNER_ROLE, msg.sender);
    _setupRole(SIGNER_ROLE, _signer);

    // setting mentaport and overwriting owner to ONLY mentaport 
    _setupRole(MENTAPORT_ROLE, _mentaAccount);
    _setupRole(MENTAPORT_ADMIN, _mentaAccount);

    // setting contract parameters
    _pause();
    maxSupply = _maxSupply;
    setBaseURI(_initNotRevealedUri);
    setNotRevealedURI(_initNotRevealedUri);
  }

  //----------------------------------------------------------------------------
  // Modifiers 
  /**
  * @dev Mint compliance to check:
  *   - Mint amount is less than max amount to mint
  *   - Still suplly available of tokens to mint
  *
  */
  modifier mintCompliance(uint256 _mintAmount) {
    require(_mintAmount > 0 && _mintAmount <= maxMintAmount, "Invalid mint amount!");
    require(_supply.current() + _mintAmount <= maxSupply, "Max supply exceeded!");

    _; // so we execute this modifier before rest of mint func code
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
  //----------------------------------------------------------------------------
  // External functions  
 /**
  * @dev Mint function for tokens
  *   - Contract not paused
  *   - Has to pass `mintCompliance`
  * 
  *  Requirement: _`mintAmount`
  *
  */
  function mint(uint256 _mintAmount)
    virtual 
    external 
    payable 
    nonReentrant
    whenNotPaused()
    mintCompliance(_mintAmount)
  {
    require(msg.value == cost * _mintAmount, "Insufficient funds!");
    _mintLoop(msg.sender, _mintAmount);
  }
  /**
  * @dev Change Mentaport account
  *
  *  - Emits a {MentaportAccount} event.
  */
  function changeMentaportAccount(address _newAddress) external nonReentrant {
    require(hasRole(MENTAPORT_ROLE, msg.sender), "Caller is not mentaport");
    _mentaAccount = _newAddress;

    emit MentaportAccount(msg.sender, _mentaAccount);
  }

  //----------------------------------------------------------------------------
  // External Only ADMIN, MINTER ROLES
  /**
  * @dev CONTRACT_ADMIN_ROLE reveals URI for contract
  *
  *  - Emits a {Reveal} event.
  */
  function reveal() virtual external  whenNotPaused() onlyContractAdmin {
    revealed = true;

    emit Reveal(msg.sender);
  }
  /**
  * @dev Pause contract by Admin
  * Requirements:
  *
  * - The contract must not be paused.
  */
  function pause() external whenNotPaused onlyContractAdmin {
    _pause();
  }
  /**
  * @dev Unpause contract by Admin
  * Requirements:
  *
  * - The contract must be paused.
  */
  function unpause() external whenPaused onlyContractAdmin {
    _unpause();
  }
  /**
  * @dev Set max mint amount
  *
  *  - Emits a {SetmaxMintAmount} event.
  */
  function setmaxMintAmount(uint256 _newmaxMintAmount) external onlyOwner {
    maxMintAmount = _newmaxMintAmount;

    emit SetMaxMintAmount(maxMintAmount);
  }
  /**
  * @dev Set cost of token at mint
  *
  *  - Emits a {SetCost} event.
  */
  function setCost(uint256 _newCost) external onlyOwner {
    cost = _newCost;

    emit SetCost(cost);
  }
  /**
  * @dev Set base extension of metadata
  */
  function setBaseExtension(string memory _newBaseExtension) external onlyOwner {
    baseExtension = _newBaseExtension;
  }
  /**
  * @dev MINTER_ROLE of contract mints `_mintAmount` of tokens for address `_receiver`
  *
  *  - Emits a {MintForAddress} event.
  */
  function mintForAddress(uint256 _mintAmount, address _receiver) virtual external nonReentrant mintCompliance(_mintAmount) onlyMinter {
    _mintLoop(_receiver, _mintAmount);

    emit MintForAddress(msg.sender, _mintAmount, _receiver);
  }
  /**
  * @dev Owner of contract withdraws funds.
  *  At this point Mentaport account will get paid the commision of 97.5%.
  *
  *  - Emits a {Withdraw} event.
  */
  function withdraw() external nonReentrant onlyOwner {
    // This will pay Mentaport 2.5% of the initial sale
    (bool success, ) = payable(_mentaAccount).call{value: address(this).balance * 25 / 1000}("");
    require(success);

    // This will payout the owner 97.5% of the contract balance.
    // Do not remove this otherwise you will not be able to withdraw the funds.
    // =============================================================================
    (bool successRest, ) = payable(owner()).call{value: address(this).balance}("");
    require(successRest);

    emit Withdraw();
  }

  //----------------------------------------------------------------------------
  // Public functions
  /**
  * @dev Token URI of token asked
  */
  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "MentaportERC721: URI query for nonexistent token");

    if(!revealed) {
      return notRevealedUri;
    }

    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0
      ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension))
      : "";
  }
  /**
  * @dev Total supply of tokens currently available
  */
  function totalSupply() public view returns (uint256) {
    return _supply.current();
  }
  //----------------------------------------------------------------------------
  // Public Only Admin 
  /**
  * @dev Set not revealed URI of tokens by Admin
  */
  function setNotRevealedURI(string memory _notRevealedURI) public onlyContractAdmin {
    notRevealedUri = _notRevealedURI;
  }
  /**
  * @dev Set base URI of tokens by Admin
  */
  function setBaseURI(string memory _newBaseURI) public onlyContractAdmin {
    baseURI = _newBaseURI;
  }
  //----------------------------------------------------------------------------
  // Internal functions
  /**
  * @dev Internal base URI of contract
  */
  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }
  /**
  * @dev Internal mint loop 
  */
  function _mintLoop(address _receiver, uint256 _mintAmount) internal {
    for (uint256 i = 0; i < _mintAmount;) {
      _supply.increment();
      _safeMint(_receiver, _supply.current());
      unchecked { i++; }
    }
  }
}
