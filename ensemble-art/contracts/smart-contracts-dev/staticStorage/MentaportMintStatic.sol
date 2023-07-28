//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "./MentaportERC721Static.sol";
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
 * @title MentaportMint
 * @dev Extending MentaportERC721Static
   Adds functionality to check rules of who, when and where user can mint NFT
**/

contract MentaportMintStatic is MentaportERC721Static {

  using Strings for uint256;

  mapping(bytes => bool) internal _usedMintSignatures;
  bool public useMintRules = true;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _initNotRevealedUri,
    uint256 _maxSupply,
    address _admin,
    address _minter,
    address _signer
    ) MentaportERC721Static(_name, _symbol, _initNotRevealedUri, _maxSupply, _admin, _minter, _signer)
  {}
  //----------------------------------------------------------------------------
  // External functions
  /**
  * @dev Mint function as in {MentaportERC721}
  *
  *   - Follows `mintCompliance` from {MentaportERC721}
  *   - Checks if the contact is using mint rules, if it is it will fail and
  *       let caller know to use `MintMenta` instead.
  *
  */
  function mint(uint256 _mintAmount)
    override 
    external 
    payable
    nonReentrant
    whenNotPaused()
    mintCompliance(_mintAmount) 
  {
    require(!useMintRules, "Failed using mint rules, use mintMenta.");
    require(msg.value == cost * _mintAmount, "Insufficient funds!");

    _mintLoop(msg.sender, _mintAmount);
  }
  /**
  * @dev MintMenta function controls signature of rules being passed
  *
  *   - Follows `mintCompliance` from {MentaportERC721}
  *   - Checks `onlyValidMessage` 
  *       - signature approves time / location rule passed
  *   - Checks that the signature ahsnt been used before
  */
  function mintMenta(uint256 _mintAmount, uint256 _rule, uint _timestamp, bytes memory _signature)
    virtual
    external
    payable
    nonReentrant
    whenNotPaused()
    mintCompliance(_mintAmount)
    onlyValidMessage(_timestamp,_rule,_signature)
  {
    require(useMintRules, "Not using mint rules, use normal mint function.");
    require(_checkMintSignature(_signature), "Signature already used, not valid anymore.");
    require(msg.value == cost * _mintAmount, "Insufficient funds!");
    
    _mintLoop(msg.sender, _mintAmount);
  }
  //----------------------------------------------------------------------------
  // External Only Admin / owner
 /**
  * @dev Set use of mint rules in contracty 
  *  Owner con contract can turn off / on the use of mint rules only
  *  
  *  - Emits a {RuleUpdate} event.
  */
  function useUseMintRules(bool _state) external onlyOwner {
    useMintRules = _state;
    uint state = useMintRules ? uint(1) : uint(0);

    emit RuleUpdate(msg.sender, string.concat("Setting mint rules: ",state.toString()));
  }
  //----------------------------------------------------------------------------
  // Internal Functions
  function _checkMintSignature(bytes memory _signature) internal returns (bool) {
    require(!_usedMintSignatures[_signature], "Signature already used, not valid anymore.");

    _usedMintSignatures[_signature] = true;
    return true;
  }
}
