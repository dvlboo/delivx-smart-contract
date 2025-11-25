import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LiveStakeModule = buildModule("LiveStakeModule", (m) => {
  const livestockNFTAddress = m.getParameter("livestockNFTAddress");

  const liveStake = m.contract("LiveStake", [livestockNFTAddress]);

  return { liveStake };
});

export default LiveStakeModule;
