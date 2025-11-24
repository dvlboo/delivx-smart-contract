import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LivestockNFTModule = buildModule("LivestockNFTModule", (m) => {
  const livestockNFT = m.contract("LivestockNFT");

  return { livestockNFT };
});

export default LivestockNFTModule;
