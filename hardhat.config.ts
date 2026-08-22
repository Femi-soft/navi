import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViem],
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  verify: {
    blockscout: {
      enabled: false,
    },
    etherscan: {
      enabled: false,
    },
    sourcify: {
      enabled: true,
    },
  },
  networks: {
    xlayerTestnet: {
      type: "http",
      chainType: "generic",
      chainId: 1952,
      url: configVariable("X_LAYER_TESTNET_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    baseSepolia: {
      type: "http",
      chainType: "op",
      chainId: 84532,
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("BASE_SEPOLIA_DEPLOYER_PRIVATE_KEY")],
    },
  },
});
