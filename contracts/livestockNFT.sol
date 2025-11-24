// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract LivestockNFT is ERC721, AccessControl {
  // Role definitions
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
  bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");

  // Token counter for auto-incrementing token IDs
  uint256 private _tokenIdCounter;

  // Livestock metadata
  struct LivestockMetadata {
    string species;        
    uint256 birthDate;     
    uint256 weight;        
    string healthStatus;   
    string farmId;         
    uint256 mintedAt;      
  }

  // Mapping from token ID to livestock metadata
  mapping(uint256 => LivestockMetadata) private _livestockMetadata;

  // Events
  event LivestockMinted(
    uint256 indexed tokenId,
    address indexed farmer,
    string species,
    string farmId
  );

  event MetadataUpdated(
    uint256 indexed tokenId,
    string healthStatus,
    uint256 weight
  );

  constructor() ERC721("DeLivX Livestock NFT", "DLX-LSNFT") {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
  }

  function mintLivestock(
    address to,
    string memory species,
    uint256 birthDate,
    uint256 weight,
    string memory healthStatus,
    string memory farmId
  ) public onlyRole(FARMER_ROLE) returns (uint256) {
    require(bytes(species).length > 0, "Species cannot be empty");
    require(bytes(farmId).length > 0, "Farm ID cannot be empty");
    require(to != address(0), "Cannot mint to zero address");

    uint256 tokenId = _tokenIdCounter;
    _tokenIdCounter++;

    // Mint the NFT
    _safeMint(to, tokenId);

    // Store metadata
    _livestockMetadata[tokenId] = LivestockMetadata({
      species: species,
      birthDate: birthDate,
      weight: weight,
      healthStatus: healthStatus,
      farmId: farmId,
      mintedAt: block.timestamp
    });

    emit LivestockMinted(tokenId, to, species, farmId);

    return tokenId;
  }

  function updateLivestockMetadata(
    uint256 tokenId,
    uint256 weight,
    string memory healthStatus
  ) public onlyRole(FARMER_ROLE) {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");

    _livestockMetadata[tokenId].weight = weight;
    _livestockMetadata[tokenId].healthStatus = healthStatus;

    emit MetadataUpdated(tokenId, healthStatus, weight);
  }

  function getLivestockMetadata(uint256 tokenId)
    public
    view
    returns (LivestockMetadata memory)
  {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");
    return _livestockMetadata[tokenId];
  }

  function addFarmer(address farmer) public onlyRole(ADMIN_ROLE) {
    grantRole(FARMER_ROLE, farmer);
  }

  function removeFarmer(address farmer) public onlyRole(ADMIN_ROLE) {
    revokeRole(FARMER_ROLE, farmer);
  }

  function totalSupply() public view returns (uint256) {
    return _tokenIdCounter;
  }

  // Query functions for transparency
  function getLivestocksByFarm(string memory farmId) 
    public 
    view 
    returns (uint256[] memory) 
  {
    uint256 total = _tokenIdCounter;
    uint256 count = 0;
    
    // Count matching tokens
    for (uint256 i = 0; i < total; i++) {
      if (keccak256(abi.encodePacked(_livestockMetadata[i].farmId)) == keccak256(abi.encodePacked(farmId))) {
        count++;
      }
    }
    
    // Build result array
    uint256[] memory result = new uint256[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < total; i++) {
      if (keccak256(abi.encodePacked(_livestockMetadata[i].farmId)) == keccak256(abi.encodePacked(farmId))) {
        result[index] = i;
        index++;
      }
    }
    
    return result;
  }

  function getLivestocksByOwner(address owner) 
    public 
    view 
    returns (uint256[] memory) 
  {
    uint256 total = _tokenIdCounter;
    uint256 count = balanceOf(owner);
    
    uint256[] memory result = new uint256[](count);
    uint256 index = 0;
    
    for (uint256 i = 0; i < total; i++) {
      if (_ownerOf(i) != address(0) && ownerOf(i) == owner) {
        result[index] = i;
        index++;
      }
    }
    
    return result;
  }

  function getLivestocksBySpecies(string memory species) 
    public 
    view 
    returns (uint256[] memory) 
  {
    uint256 total = _tokenIdCounter;
    uint256 count = 0;
    
    // Count matching tokens
    for (uint256 i = 0; i < total; i++) {
      if (keccak256(abi.encodePacked(_livestockMetadata[i].species)) == keccak256(abi.encodePacked(species))) {
        count++;
      }
    }
    
    // Build result array
    uint256[] memory result = new uint256[](count);
    uint256 index = 0;
    for (uint256 i = 0; i < total; i++) {
      if (keccak256(abi.encodePacked(_livestockMetadata[i].species)) == keccak256(abi.encodePacked(species))) {
        result[index] = i;
        index++;
      }
    }
    
    return result;
  }

  function getAllLivestocks() 
    public 
    view 
    returns (uint256[] memory) 
  {
    uint256 total = _tokenIdCounter;
    uint256[] memory result = new uint256[](total);
    
    for (uint256 i = 0; i < total; i++) {
      result[i] = i;
    }
    
    return result;
  }

  // Required overrides
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, AccessControl)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}