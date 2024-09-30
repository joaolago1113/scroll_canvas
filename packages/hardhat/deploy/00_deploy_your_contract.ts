import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const PAINT_TOKEN_SUPPLY = "10000000000000000000000000"; // 10,000,000 tokens with 18 decimals

  console.log("Deployer address:", deployer);

  // Deploy the CollaborativeArtCanvas contract first
  const collaborativeArtCanvas = await deploy("CollaborativeArtCanvas", {
    from: deployer,
    args: [deployer], // Pass the deployer address as the initial owner
    log: true,
    autoMine: true,
  });

  // Deploy the PaintToken contract, passing the CollaborativeArtCanvas address as the constructor argument
  await deploy("PaintToken", {
    from: deployer,
    args: [PAINT_TOKEN_SUPPLY, collaborativeArtCanvas.address], // Pass the initial supply and the CollaborativeArtCanvas address
    log: true,
    autoMine: true,
  });

  
};

export default func;
func.tags = ["CollaborativeArtCanvas", "PaintToken"];
