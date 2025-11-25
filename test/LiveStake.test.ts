import { describe, it, before, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { network } from "hardhat";

describe("LiveStake", async () => {
  const { viem } = await network.connect();

  let livestockNFT: any;
  let liveStake: any;
  let owner: any;
  let farmer: any;
  let staker1: any;
  let staker2: any;

  before(async () => {
    [owner, farmer, staker1, staker2] = await viem.getWalletClients();

    // Deploy LivestockNFT
    livestockNFT = await viem.deployContract("LivestockNFT");

    // Deploy LiveStake
    liveStake = await viem.deployContract("LiveStake", [livestockNFT.address]);

    // Add farmer role and mint NFTs for testing
    await livestockNFT.write.addFarmer([farmer.account.address]);

    const farmerContract = await viem.getContractAt(
      "LivestockNFT",
      livestockNFT.address,
      { client: { wallet: farmer } }
    );

    // Mint NFT #0 to staker1
    await farmerContract.write.mintLivestock([
      staker1.account.address,
      "cow",
      1700000000n,
      50000n,
      "healthy",
      "FARM-001"
    ]);

    // Mint NFT #1 to staker1
    await farmerContract.write.mintLivestock([
      staker1.account.address,
      "chicken",
      1700000000n,
      2000n,
      "healthy",
      "FARM-001"
    ]);

    // Mint NFT #2 to staker2
    await farmerContract.write.mintLivestock([
      staker2.account.address,
      "goat",
      1700000000n,
      30000n,
      "healthy",
      "FARM-002"
    ]);
  });

  describe("Deployment", () => {
    it("should set the correct NFT contract address", async () => {
      const nftAddress = await liveStake.read.livestockNFT();
      assert.equal(nftAddress.toLowerCase(), livestockNFT.address.toLowerCase());
    });
  });

  describe("Stake Function", () => {
    it("should allow NFT owner to stake", async () => {
      const staker1Contract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: staker1 } }
      );

      // Approve stake contract
      await staker1Contract.write.approve([liveStake.address, 0n]);

      const stakeContract = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: staker1 } }
      );

      await stakeContract.write.stake([0n]);

      // Check staker mapping
      const staker = await liveStake.read.getStaker([0n]);
      assert.equal(staker.toLowerCase(), staker1.account.address.toLowerCase());

      // Check NFT is transferred to stake contract
      const nftOwner = await livestockNFT.read.ownerOf([0n]);
      assert.equal(nftOwner.toLowerCase(), liveStake.address.toLowerCase());

      // Check report access is granted
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, true);
    });

    it("should add token to staker's staked tokens list", async () => {
      const tokens = await liveStake.read.getStakedTokens([staker1.account.address]);
      assert.equal(tokens.length >= 1, true);
      assert.equal(tokens[0], 0n);
    });

    it("should allow staking multiple NFTs", async () => {
      const staker1NFTContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: staker1 } }
      );

      await staker1NFTContract.write.approve([liveStake.address, 1n]);

      const stakeContract = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: staker1 } }
      );

      await stakeContract.write.stake([1n]);

      const tokens = await liveStake.read.getStakedTokens([staker1.account.address]);
      assert.equal(tokens.length, 2);
    });
  });

  describe("Unstake Function", () => {
    it("should allow staker to unstake their NFT", async () => {
      const stakeContract = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: staker1 } }
      );

      await stakeContract.write.unstake([0n]);

      // Check staker mapping is cleared
      const staker = await liveStake.read.getStaker([0n]);
      assert.equal(staker, "0x0000000000000000000000000000000000000000");

      // Check NFT is returned to owner
      const nftOwner = await livestockNFT.read.ownerOf([0n]);
      assert.equal(nftOwner.toLowerCase(), staker1.account.address.toLowerCase());

      // Check report access is revoked
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, false);
    });

    it("should remove token from staker's staked tokens list", async () => {
      const tokens = await liveStake.read.getStakedTokens([staker1.account.address]);
      
      // Should only have token #1 left
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0], 1n);
    });
  });

  describe("Report Access", () => {
    it("should grant report access when staked", async () => {
      // Token #1 is still staked
      const hasAccess = await liveStake.read.hasReportAccess([1n]);
      assert.equal(hasAccess, true);
    });

    it("should revoke report access when unstaked", async () => {
      // Token #0 was unstaked
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, false);
    });

    it("should return false for never-staked tokens", async () => {
      const hasAccess = await liveStake.read.hasReportAccess([2n]);
      assert.equal(hasAccess, false);
    });
  });

  describe("View Functions", () => {
    it("getStaker should return correct staker address", async () => {
      const staker = await liveStake.read.getStaker([1n]);
      assert.equal(staker.toLowerCase(), staker1.account.address.toLowerCase());
    });

    it("getStaker should return zero address for unstaked tokens", async () => {
      const staker = await liveStake.read.getStaker([0n]);
      assert.equal(staker, "0x0000000000000000000000000000000000000000");
    });

    it("getStakedTokens should return all staked tokens for address", async () => {
      const tokens = await liveStake.read.getStakedTokens([staker1.account.address]);
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0], 1n);
    });

    it("getStakedTokens should return empty array for non-stakers", async () => {
      const tokens = await liveStake.read.getStakedTokens([owner.account.address]);
      assert.equal(tokens.length, 0);
    });
  });

  describe("Multiple Stakers", () => {
    it("should handle multiple independent stakers", async () => {
      const staker2NFTContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: staker2 } }
      );

      await staker2NFTContract.write.approve([liveStake.address, 2n]);

      const staker2StakeContract = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: staker2 } }
      );

      await staker2StakeContract.write.stake([2n]);

      // Check staker1 still has their tokens
      const staker1Tokens = await liveStake.read.getStakedTokens([staker1.account.address]);
      assert.equal(staker1Tokens.length, 1);

      // Check staker2 has their tokens
      const staker2Tokens = await liveStake.read.getStakedTokens([staker2.account.address]);
      assert.equal(staker2Tokens.length, 1);
      assert.equal(staker2Tokens[0], 2n);
    });

    it("should grant independent report access", async () => {
      const access1 = await liveStake.read.hasReportAccess([1n]);
      const access2 = await liveStake.read.hasReportAccess([2n]);
      
      assert.equal(access1, true);
      assert.equal(access2, true);
    });
  });

  describe("ERC721Receiver", () => {
    it("should implement ERC721Receiver interface", async () => {
      const selector = await liveStake.read.onERC721Received([
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        0n,
        "0x"
      ]);
      
      // onERC721Received selector is 0x150b7a02
      assert.equal(selector, "0x150b7a02");
    });
  });
});
