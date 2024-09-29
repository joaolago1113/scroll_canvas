import { expect } from "chai";
import { ethers } from "hardhat";
import { CollaborativeArtCanvas } from "../typechain-types/contracts/CollaborativeArtCanvas";

describe("CollaborativeArtCanvas", function () {
  let collaborativeArtCanvas: CollaborativeArtCanvas;
  let owner: any;
  let addr1: any;

  before(async () => {
    [owner, addr1] = await ethers.getSigners();
    const CollaborativeArtCanvasFactory = await ethers.getContractFactory("CollaborativeArtCanvas");
    collaborativeArtCanvas = (await CollaborativeArtCanvasFactory.deploy(owner.address)) as CollaborativeArtCanvas;
    await collaborativeArtCanvas.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await collaborativeArtCanvas.owner()).to.equal(owner.address);
    });

    it("Should have the correct canvas dimensions", async function () {
      expect(await collaborativeArtCanvas.CANVAS_WIDTH()).to.equal(32);
      expect(await collaborativeArtCanvas.CANVAS_HEIGHT()).to.equal(32);
    });

    it("Should have the correct total pixels", async function () {
      const totalPixels = await collaborativeArtCanvas.TOTAL_PIXELS();
      expect(totalPixels).to.equal(32 * 32);
    });
  });

  describe("Pixel Operations", function () {
    const pixelId = 478;
    const pixelColor = 0xFF0000; // Red

    it("Should allow buying a pixel", async function () {
      await expect(
        collaborativeArtCanvas.connect(addr1).buyPixel(pixelId, { value: ethers.parseEther("0.01") })
      ).to.emit(collaborativeArtCanvas, "PixelChanged")
        .withArgs(pixelId, 0xFFFFFF, addr1.address);
      
      const pixel = await collaborativeArtCanvas.getPixel(pixelId);
      expect(pixel.owner).to.equal(addr1.address);
      expect(pixel.color).to.equal(0xFFFFFF); // Default color
    });

    it("Should allow setting pixel color", async function () {
      await expect(
        collaborativeArtCanvas.connect(addr1).setPixelColor(pixelId, pixelColor)
      ).to.emit(collaborativeArtCanvas, "PixelChanged")
        .withArgs(pixelId, pixelColor, addr1.address);
      
      const pixel = await collaborativeArtCanvas.getPixel(pixelId);
      expect(pixel.color).to.equal(pixelColor);
    });

    it("Should not allow setting color of an unowned pixel", async function () {
      const unownedPixelId = 479; // Assuming this hasn't been bought yet
      await expect(
        collaborativeArtCanvas.connect(addr1).setPixelColor(unownedPixelId, 0x00FF00)
      ).to.be.revertedWith("ERC721: invalid token ID");
    });
  });
});