import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NaviModule", (m) => {
  const initialOwner = m.getAccount(0);
  const policyManager = m.contract("NaviPolicyManager");
  const executor = m.contract("NaviExecutor", [initialOwner]);

  return { policyManager, executor };
});
