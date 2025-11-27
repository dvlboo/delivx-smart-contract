import { describe, it, before } from "node:test";
import { strict as assert } from "node:assert";
import { network } from "hardhat";

describe("Integration: LivestockNFT + LiveStake", async () => {
  const { viem } = await network.connect();

  let livestockNFT: any;
  let liveStake: any;
  let owner: any;
  let farmer: any;
  let investor1: any;
  let investor2: any;

  before(async () => {
    [owner, farmer, investor1, investor2] = await viem.getWalletClients();

    // Deploy contracts
    livestockNFT = await viem.deployContract("LivestockNFT");
    liveStake = await viem.deployContract("LiveStake", [livestockNFT.address]);

    // Setup: Add farmer
    await livestockNFT.write.addFarmer([farmer.account.address]);

    const farmerContract = await viem.getContractAt(
      "LivestockNFT",
      livestockNFT.address,
      { client: { wallet: farmer } }
    );

    // Mint NFTs for investors
    await farmerContract.write.mintLivestock([
      investor1.account.address,
      "cow",
      1700000000n,
      50000n,
      "healthy",
      "FARM-001"
    ]);

    await farmerContract.write.mintLivestock([
      investor1.account.address,
      "chicken",
      1700000000n,
      2000n,
      "healthy",
      "FARM-001"
    ]);

    await farmerContract.write.mintLivestock([
      investor2.account.address,
      "goat",
      1700000000n,
      30000n,
      "vaccinated",
      "FARM-002"
    ]);
  });

  describe("End-to-End Workflow", () => {
    it("investor should own NFT initially", async () => {
      const owner1 = await livestockNFT.read.ownerOf([0n]);
      assert.equal(owner1.toLowerCase(), investor1.account.address.toLowerCase());
    });

    it("investor should not have report access before staking", async () => {
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, false);
    });

    it("investor can stake NFT and gain report access", async () => {
      const investor1NFT = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: investor1 } }
      );

      // Approve stake contract
      await investor1NFT.write.approve([liveStake.address, 0n]);

      const investor1Stake = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: investor1 } }
      );

      // Stake NFT
      await investor1Stake.write.stake([0n]);

      // Verify NFT transferred to stake contract
      const nftOwner = await livestockNFT.read.ownerOf([0n]);
      assert.equal(nftOwner.toLowerCase(), liveStake.address.toLowerCase());

      // Verify report access granted
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, true);

      // Verify staker recorded
      const staker = await liveStake.read.getStaker([0n]);
      assert.equal(staker.toLowerCase(), investor1.account.address.toLowerCase());
    });

    it("investor can query their staked NFTs", async () => {
      const stakedTokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      assert.equal(stakedTokens.length, 1);
      assert.equal(stakedTokens[0], 0n);
    });

    it("investor can view livestock metadata while staked", async () => {
      const metadata = await livestockNFT.read.getLivestockMetadata([0n]);
      
      assert.equal(metadata.species, "cow");
      assert.equal(metadata.weight, 50000n);
      assert.equal(metadata.healthStatus, "healthy");
      assert.equal(metadata.farmId, "FARM-001");
    });

    it("farmer can update metadata of staked NFT", async () => {
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.updateLivestockMetadata([
        0n,
        52000n,
        "vaccinated"
      ]);

      const metadata = await livestockNFT.read.getLivestockMetadata([0n]);
      assert.equal(metadata.weight, 52000n);
      assert.equal(metadata.healthStatus, "vaccinated");
    });

    it("investor can stake multiple NFTs", async () => {
      const investor1NFT = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: investor1 } }
      );

      await investor1NFT.write.approve([liveStake.address, 1n]);

      const investor1Stake = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: investor1 } }
      );

      await investor1Stake.write.stake([1n]);

      const stakedTokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      assert.equal(stakedTokens.length, 2);
    });

    it("multiple investors can stake independently", async () => {
      const investor2NFT = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: investor2 } }
      );

      await investor2NFT.write.approve([liveStake.address, 2n]);

      const investor2Stake = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: investor2 } }
      );

      await investor2Stake.write.stake([2n]);

      // Check both investors have their staked tokens
      const investor1Tokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      const investor2Tokens = await liveStake.read.getStakedTokens([investor2.account.address]);

      assert.equal(investor1Tokens.length, 2);
      assert.equal(investor2Tokens.length, 1);

      // Both have report access
      const access1 = await liveStake.read.hasReportAccess([0n]);
      const access2 = await liveStake.read.hasReportAccess([2n]);
      assert.equal(access1, true);
      assert.equal(access2, true);
    });

    it("investor can unstake NFT and lose report access", async () => {
      const investor1Stake = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: investor1 } }
      );

      await investor1Stake.write.unstake([0n]);

      // NFT returned to investor
      const nftOwner = await livestockNFT.read.ownerOf([0n]);
      assert.equal(nftOwner.toLowerCase(), investor1.account.address.toLowerCase());

      // Report access revoked
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, false);

      // Token removed from staked list
      const stakedTokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      assert.equal(stakedTokens.length, 1);
      assert.equal(stakedTokens[0], 1n);
    });

    it("investor can re-stake previously unstaked NFT", async () => {
      const investor1NFT = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: investor1 } }
      );

      await investor1NFT.write.approve([liveStake.address, 0n]);

      const investor1Stake = await viem.getContractAt(
        "LiveStake",
        liveStake.address,
        { client: { wallet: investor1 } }
      );

      await investor1Stake.write.stake([0n]);

      // Report access granted again
      const hasAccess = await liveStake.read.hasReportAccess([0n]);
      assert.equal(hasAccess, true);

      const stakedTokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      assert.equal(stakedTokens.length, 2);
    });
  });

  describe("Query Integration", () => {
    it("can query all livestock from a farm", async () => {
      const farm1Tokens = await livestockNFT.read.getLivestocksByFarm(["FARM-001"]);
      assert.equal(farm1Tokens.length >= 2, true);
    });

    it("can check which investors have report access", async () => {
      const access0 = await liveStake.read.hasReportAccess([0n]);
      const access1 = await liveStake.read.hasReportAccess([1n]);
      const access2 = await liveStake.read.hasReportAccess([2n]);

      // All should have access (all staked)
      assert.equal(access0, true);
      assert.equal(access1, true);
      assert.equal(access2, true);
    });

    it("can get all staked tokens across all stakers", async () => {
      const investor1Tokens = await liveStake.read.getStakedTokens([investor1.account.address]);
      const investor2Tokens = await liveStake.read.getStakedTokens([investor2.account.address]);

      const totalStaked = investor1Tokens.length + investor2Tokens.length;
      assert.equal(totalStaked, 3);
    });
  });

  describe("Data Transparency for Investors", () => {
    it("staked investor can access full livestock data", async () => {
      // Investor1 has tokens 0 and 1 staked
      const stakedTokens = await liveStake.read.getStakedTokens([investor1.account.address]);

      for (const tokenId of stakedTokens) {
        const hasAccess = await liveStake.read.hasReportAccess([tokenId]);
        assert.equal(hasAccess, true);

        const metadata = await livestockNFT.read.getLivestockMetadata([tokenId]);
        assert.notEqual(metadata.species, "");
        assert.notEqual(metadata.farmId, "");
      }
    });

    it("can track livestock by owner even when staked", async () => {
      // Even though NFT is in stake contract, we can track original staker
      const staker0 = await liveStake.read.getStaker([0n]);
      const staker1 = await liveStake.read.getStaker([1n]);

      assert.equal(staker0.toLowerCase(), investor1.account.address.toLowerCase());
      assert.equal(staker1.toLowerCase(), investor1.account.address.toLowerCase());
    });
  });
});
