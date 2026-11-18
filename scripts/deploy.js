const hre = require("hardhat");

async function main() {
  const AGENT_ID_ADDRESS = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

  console.log("Deploying AgentTip to", hre.network.name, "...");
  console.log("Agent ID contract:", AGENT_ID_ADDRESS);

  const AgentTip = await hre.ethers.getContractFactory("AgentTip");
  const agentTip = await AgentTip.deploy(AGENT_ID_ADDRESS);
  await agentTip.waitForDeployment();

  const address = await agentTip.getAddress();
  console.log("\n✅ AgentTip deployed to:", address);
  console.log(`\n📋 Next steps:`);
  console.log(`1. Update CONFIG.contractAddress in frontend/app.js`);
  console.log(`2. Update contract link in frontend/index.html`);
  console.log(`3. Verify on BscScan:`);
  console.log(`   npx hardhat verify --network ${hre.network.name} ${address} ${AGENT_ID_ADDRESS}`);
  console.log(`4. Deploy frontend to Vercel`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
