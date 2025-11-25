// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract LiveStake is IERC721Receiver {
  IERC721 public livestockNFT;

  // mappings
  mapping(uint256 => address) public stakers;
  mapping(address => uint256[]) public stakedTokens;
  mapping(uint256 => bool) public reportAccess;

  // events
  event Staked(address indexed staker, uint256 indexed tokenId);
  event Unstaked(address indexed staker, uint256 indexed tokenId);

  constructor(address _livestockNFT) {
    require(_livestockNFT != address(0), "Invalid NFT address");
    livestockNFT = IERC721(_livestockNFT);
  }

  function stake(uint256 tokenId) external {
    require(livestockNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
    require(stakers[tokenId] == address(0), "Already staked");

    livestockNFT.safeTransferFrom(msg.sender, address(this), tokenId);
    
    stakers[tokenId] = msg.sender;
    stakedTokens[msg.sender].push(tokenId);
    reportAccess[tokenId] = true;

    emit Staked(msg.sender, tokenId);
  }

  function unstake(uint256 tokenId) external {
    require(stakers[tokenId] == msg.sender, "Not the staker");

    livestockNFT.safeTransferFrom(address(this), msg.sender, tokenId);
    
    delete stakers[tokenId];
    reportAccess[tokenId] = false;

    // Remove tokenId from stakedTokens array
    uint256[] storage tokens = stakedTokens[msg.sender];
    for (uint256 i = 0; i < tokens.length; i++) {
      if (tokens[i] == tokenId) {
        tokens[i] = tokens[tokens.length - 1];
        tokens.pop();
        break;
      }
    }

    emit Unstaked(msg.sender, tokenId);
  }

  function hasReportAccess(uint256 tokenId) external view returns (bool) {
    return reportAccess[tokenId];
  }

  function getStakedTokens(address staker) external view returns (uint256[] memory) {
    return stakedTokens[staker];
  }

  function getStaker(uint256 tokenId) external view returns (address) {
    return stakers[tokenId];
  }

  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}