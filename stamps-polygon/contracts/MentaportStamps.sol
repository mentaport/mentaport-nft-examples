//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@mentaport/solidity-contracts/contracts/interfaces/IMentaportERC721.sol";
import "@mentaport/solidity-contracts/contracts/main/MentaportVerify.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

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
 * @title MentaportStamps
 * @dev Extending MentaportMint
  Uses mentaport ERC721 contract.
**/
contract MentaportStamps is
    ERC721URIStorage,
    MentaportVerify,
    Ownable,
    Pausable,
    ReentrancyGuard,
    IMentaportERC721
{
    using Strings for uint256;
    using Counters for Counters.Counter;
    uint256 public immutable maxSupply;
    uint256 public cost = 0.00 ether;
    Counters.Counter internal _supply;
    mapping(bytes => bool) internal _usedMintSignatures;
    bool public useMintRules = true;

    // we intiate our contract with a hidden URI for our content to make sure we control the information at mint.
    constructor(
        string memory _name,
        string memory _symbol,
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

        // setting contract parameters
        _setupRole(MENTAPORT_ROLE, msg.sender);
        _setupRole(MENTAPORT_ADMIN, msg.sender);
        _pause();
        maxSupply = _maxSupply;
    }

    //----------------------------------------------------------------------------
    // Modifiers
    /**
     * @dev Mint compliance to check:
     *   - Mint amount is less than max amount to mint
     *   - Still suplly available of tokens to mint
     *
     */
    modifier mintCompliance(address _receiver) {
        require(_supply.current() + 1 <= maxSupply, "Max supply exceeded!");
        _; // so we execute this modifier before rest of mint function code
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

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
    function mint(
        string memory _tokenURI
    ) external payable nonReentrant whenNotPaused mintCompliance(msg.sender) {
        require(!useMintRules, "Failed using mint rules, use mintMenta.");
        require(msg.value == cost, "Insufficient funds!");

        _mintNFT(msg.sender, _tokenURI);
    }

    /**
     * @dev MintMenta function controls signature of rules being passed
     *
     *   - Follows `mintCompliance` from {MentaportERC721}
     *   - Checks `onlyValidMessage`
     *       - signature approves time / location rule passed
     *   - Checks that the signature ahsnt been used before
     */
    function mintMenta(
        string memory _tokenURI,
        uint256 _rule,
        uint _timestamp,
        bytes memory _signature
    )
        external
        payable
        nonReentrant
        whenNotPaused
        mintCompliance(msg.sender)
        onlyValidMessage(_timestamp, _rule, _signature)
    {
        require(
            useMintRules,
            "Not using mint rules, use normal mint function."
        );
        require(msg.value == cost, "Insufficient funds!");
        require(
            _checkMintSignature(_signature),
            "Signature already used, not valid anymore."
        );

        _mintNFT(msg.sender, _tokenURI);
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

        emit RuleUpdate(
            msg.sender,
            string.concat("Setting mint rules: ", state.toString())
        );
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
     * @dev Set cost of token at mint
     *
     *  - Emits a {SetCost} event.
     */
    function setCost(uint256 _newCost) external onlyOwner {
        cost = _newCost;
        emit SetCost(cost);
    }

    /**
     * @dev MINTER_ROLE of contract mints 1 token for address `_receiver`, with `_tokenURI`
     *
     *  - Emits a {MintForAddress} event.
     */
    function mintForAddress(
        string memory _tokenURI,
        address _receiver
    ) external virtual nonReentrant mintCompliance(_receiver) onlyMinter {
        _mintNFT(msg.sender, _tokenURI);

        emit MintForAddress(msg.sender, 1, _receiver);
    }

    /**
     * @dev Owner of contract withdraws funds.
     *
     *  - Emits a {Withdraw} event.
     */
    function withdraw() external nonReentrant onlyOwner {
        // =============================================================================
        (bool successRest, ) = payable(owner()).call{
            value: address(this).balance
        }("");
        require(successRest);

        emit Withdraw();
    }

    //----------------------------------------------------------------------------
    // Public functions
    /**
     * @dev Total supply of tokens currently available
     */
    function totalSupply() public view returns (uint256) {
        return _supply.current();
    }

    //----------------------------------------------------------------------------
    // Internal Functions
    function _checkMintSignature(
        bytes memory _signature
    ) internal returns (bool) {
        require(
            !_usedMintSignatures[_signature],
            "Signature already used, not valid anymore."
        );

        _usedMintSignatures[_signature] = true;
        return true;
    }

    /**
     * @dev Internal mint nft with unique tokenURI
     */
    function _mintNFT(address _receiver, string memory _tokenURI) internal {
        uint256 newItemId = _supply.current();
        _safeMint(_receiver, newItemId);
        _setTokenURI(newItemId, _tokenURI);
        _supply.increment();
    }
}
