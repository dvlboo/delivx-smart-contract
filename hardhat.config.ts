import { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatIgnitionViemPlugin from "@nomicfoundation/hardhat-ignition-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatPlugin from "@nomicfoundation/hardhat-viem";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatIgnitionViemPlugin, hardhatVerify, hardhatPlugin,
  ],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "mantle-sepolia": {
      type: "http",
      url: "https://rpc.sepolia.mantle.xyz",
      accounts: [process.env.PRIVATE_KEY as string],
      chainId: 5003,
    },
  },
  chainDescriptors: {
    5003: {
      name: "Mantle Sepolia",
      blockExplorers: {
        blockscout: {
          name: "Mantle Explorer",
          url: "https://explorer.sepolia.mantle.xyz/",
          apiUrl: "https://explorer-sepolia.mantle.xyz/api",
        },
      },
    },
  },
  verify: {
    blockscout: {
      enabled: true,
    },
  },
};

export default config;
