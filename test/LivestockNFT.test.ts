import { describe, it, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { network } from "hardhat";

describe("LivestockNFT", async () => {

  const { viem } = await network.connect();

  let livestockNFT: any;
  let owner: any;
  let farmer: any;
  let investor: any;

  beforeEach(async () => {
    [owner, farmer, investor] = await viem.getWalletClients();
    livestockNFT = await viem.deployContract("LivestockNFT");
  });

  describe("Deployment", () => {
    it("should set the correct name and symbol", async () => {
      const name = await livestockNFT.read.name();
      const symbol = await livestockNFT.read.symbol();
      
      assert.equal(name, "DeLivX Livestock NFT");
      assert.equal(symbol, "DLX-LSNFT");
    });

    it("should grant ADMIN_ROLE to deployer", async () => {
      const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const hasRole = await livestockNFT.read.hasRole([ADMIN_ROLE, owner.account.address]);
      
      assert.equal(hasRole, true);
    });

    it("should have zero total supply initially", async () => {
      const supply = await livestockNFT.read.totalSupply();
      assert.equal(supply, 0n);
    });
  });

  describe("Role Management", () => {
    it("admin should be able to add farmer", async () => {
      await livestockNFT.write.addFarmer([farmer.account.address]);
      
      const FARMER_ROLE = await livestockNFT.read.FARMER_ROLE();
      const hasRole = await livestockNFT.read.hasRole([FARMER_ROLE, farmer.account.address]);
      
      assert.equal(hasRole, true);
    });

    it("admin should be able to remove farmer", async () => {
      await livestockNFT.write.addFarmer([farmer.account.address]);
      await livestockNFT.write.removeFarmer([farmer.account.address]);
      
      const FARMER_ROLE = await livestockNFT.read.FARMER_ROLE();
      const hasRole = await livestockNFT.read.hasRole([FARMER_ROLE, farmer.account.address]);
      
      assert.equal(hasRole, false);
    });
  });

  describe("Minting", () => {
    beforeEach(async () => {
      await livestockNFT.write.addFarmer([farmer.account.address]);
    });

    it("farmer should be able to mint livestock NFT", async () => {
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "cow",
        BigInt(Math.floor(Date.now() / 1000)),
        50000n,
        "healthy",
        "FARM-001"
      ]);

      const supply = await livestockNFT.read.totalSupply();
      assert.equal(supply, 1n);

      const tokenOwner = await livestockNFT.read.ownerOf([0n]);
      assert.equal(tokenOwner.toLowerCase(), investor.account.address.toLowerCase());
    });

    it("should increment token IDs correctly", async () => {
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "cow",
        1700000000n,
        50000n,
        "healthy",
        "FARM-001"
      ]);

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "chicken",
        1700000000n,
        2000n,
        "healthy",
        "FARM-001"
      ]);

      const supply = await livestockNFT.read.totalSupply();
      assert.equal(supply, 2n);
    });
  });

  describe("Metadata", () => {
    beforeEach(async () => {
      await livestockNFT.write.addFarmer([farmer.account.address]);
      
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "cow",
        1700000000n,
        50000n,
        "healthy",
        "FARM-001"
      ]);
    });

    it("should return correct metadata", async () => {
      const metadata = await livestockNFT.read.getLivestockMetadata([0n]);

      assert.equal(metadata.species, "cow");
      assert.equal(metadata.birthDate, 1700000000n);
      assert.equal(metadata.weight, 50000n);
      assert.equal(metadata.healthStatus, "healthy");
      assert.equal(metadata.farmId, "FARM-001");
    });

    it("farmer should be able to update metadata", async () => {
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.updateLivestockMetadata([
        0n,
        55000n,
        "vaccinated"
      ]);

      const metadata = await livestockNFT.read.getLivestockMetadata([0n]);
      assert.equal(metadata.weight, 55000n);
      assert.equal(metadata.healthStatus, "vaccinated");
    });
  });

  describe("Query Functions", () => {
    beforeEach(async () => {
      await livestockNFT.write.addFarmer([farmer.account.address]);
      
      const farmerContract = await viem.getContractAt(
        "LivestockNFT",
        livestockNFT.address,
        { client: { wallet: farmer } }
      );

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "cow",
        1700000000n,
        50000n,
        "healthy",
        "FARM-001"
      ]);

      await farmerContract.write.mintLivestock([
        investor.account.address,
        "chicken",
        1700000000n,
        2000n,
        "healthy",
        "FARM-001"
      ]);
    });

    it("should return livestocks by farm", async () => {
      const tokens = await livestockNFT.read.getLivestocksByFarm(["FARM-001"]);
      assert.equal(tokens.length, 2);
    });

    it("should return livestocks by owner", async () => {
      const tokens = await livestockNFT.read.getLivestocksByOwner([investor.account.address]);
      assert.equal(tokens.length, 2);
    });

    it("should return livestocks by species", async () => {
      const cows = await livestockNFT.read.getLivestocksBySpecies(["cow"]);
      assert.equal(cows.length, 1);

      const chickens = await livestockNFT.read.getLivestocksBySpecies(["chicken"]);
      assert.equal(chickens.length, 1);
    });

    it("should return all livestocks", async () => {
      const all = await livestockNFT.read.getAllLivestocks();
      assert.equal(all.length, 2);
    });
  });
});
