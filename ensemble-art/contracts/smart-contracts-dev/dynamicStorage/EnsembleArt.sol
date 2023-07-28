//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import "../staticStorage/MentaportDynamic.sol";
import "./MentaportERC721.sol";
import "./MentaportMint.sol";
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
* @title EnsembleArt
* @dev Extending MentaportDynamic
*
*  Adds functionality to have dynamic state upgrades of NFT tokens with defined location rules.
*/
contract EnsembleArt is MentaportMint {

    struct LocationRule {
        uint256 locationRuleId;
        uint256 locationRuleIndex;
    }

    struct LocationProp {
        uint8 colorSelection;
        uint8 shapeSelection;
        uint8 shapeDistribution;
        uint256 numberOfShapes;
    }

    struct MintRequest {
        bytes signature;
        uint256 timestamp;
        address receiver;
        string tokenURI;
    }

    event MintLocation(address sender, uint256 tokenId);

    uint256 public constant MAX_MINT_AMOUNT = 1;
    uint256 public maxLocationRules = 100;
    mapping(uint256 => LocationProp[]) internal _usedLocationRules;
    mapping(uint256 => LocationRule) internal _tokenIdLocationRules;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        address _admin,
        address _minter,
        address _signer
    ) MentaportMint(_name, _symbol, _maxSupply, _admin, _minter, _signer)
    {
        maxMintAmount = MAX_MINT_AMOUNT;
    }

    function mintWithLocationRules(
        uint256 _locationRuleId,
        LocationProp calldata locationProp,
        MintRequest calldata _mintRequest
    )
    virtual
    external
    payable
    nonReentrant
    whenNotPaused()
    mintCompliance(_mintRequest.receiver)
    onlyValidSigner(_mintRequest.receiver, _mintRequest.timestamp, _locationRuleId, _mintRequest.signature)
    {
        uint256 length = _usedLocationRules[_locationRuleId].length;

        require(length < maxLocationRules, "All locations exhausted");
        require(_locationRuleId >= 1 && _locationRuleId <= 3, "Rule Id is from 1 to 3");
        require(useMintRules, "Not using mint rules, use normal mint function.");
        require(_checkMintSignature(_mintRequest.signature), "Signature already used, not valid anymore.");
        require(msg.value == cost * MAX_MINT_AMOUNT, "Insufficient funds!");

        _usedLocationRules[_locationRuleId].push(locationProp);

        uint256 tokenId = _mintLocation(_mintRequest.receiver, _mintRequest.tokenURI);
        _setTokenIdLocation(tokenId, _locationRuleId, length);
        emit MintLocation(_mintRequest.receiver, tokenId);
    }

    function setMaxLocationRules(uint256 _maxLocationRules) public onlyOwner {
        maxLocationRules = _maxLocationRules;
    }

    function getTokenLocationRule(uint256 tokenId)
    public
    view
    returns(uint256 locationRuleId, uint256 locationRuleIndex) {
        return _getLocationFromTokenId(tokenId);
    }

    function getLocationRuleSize(uint256 locationRuleId)
    public
    view
    returns(uint256) {
        return _usedLocationRules[locationRuleId].length;
    }

    function getTokenLocationProp(uint256 locationRuleId, uint256 locationRuleIndex)
    public
    view
    returns(LocationProp memory locationProp) {
        locationProp = _usedLocationRules[locationRuleId][locationRuleIndex];
        return locationProp;
    }

    function _setTokenIdLocation(
        uint256 _tokenId,
        uint256 _locationRuleId,
        uint256 _locationRuleIndex
    ) internal  {
        _tokenIdLocationRules[_tokenId] = LocationRule({
            locationRuleId : _locationRuleId,
            locationRuleIndex : _locationRuleIndex
        });
    }

    function _getLocationFromTokenId(uint256 tokenId) internal view returns(
        uint256 _locationRuleId, uint256 _locationRuleIndex
    ) {
        LocationRule memory locationRule = _tokenIdLocationRules[tokenId];
        return (locationRule.locationRuleId, locationRule.locationRuleIndex);
    }
}
