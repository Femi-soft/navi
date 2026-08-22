import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AAVE_BASE_SEPOLIA_POOL = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27";
const AAVE_BASE_SEPOLIA_USDC = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";
const AAVE_BASE_SEPOLIA_A_USDC = "0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC";
const MAX_USDC_PER_ACTION = 1_000n * 1_000_000n;

export default buildModule("NaviBaseSepoliaModule", (m) => {
  const initialOwner = m.getAccount(0);
  const policyManager = m.contract("NaviPolicyManagerV2");
  const executor = m.contract("NaviExecutorV2", [initialOwner, policyManager]);
  const aaveUsdcAdapter = m.contract("AaveSupplyWithdrawAdapterV2", [
    executor,
    AAVE_BASE_SEPOLIA_POOL,
    AAVE_BASE_SEPOLIA_USDC,
    AAVE_BASE_SEPOLIA_A_USDC,
    MAX_USDC_PER_ACTION,
  ]);

  return { policyManager, executor, aaveUsdcAdapter };
});
