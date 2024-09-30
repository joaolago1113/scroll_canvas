// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Import necessary OpenZeppelin contracts
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PaintToken.sol";

/// @title CollaborativeArtCanvas
/// @notice A contract that allows users to collaboratively create pixel art by purchasing and setting pixel colors
contract CollaborativeArtCanvas is Ownable, ReentrancyGuard {
    // Constants for canvas dimensions
    uint256 public constant CANVAS_WIDTH = 64;
    uint256 public constant CANVAS_HEIGHT = 64;
    uint256 public constant TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

    /// @notice Represents a pixel on the canvas
    struct Pixel {
        uint256 color;
    }

    /// @notice Mapping from pixel ID to Pixel data
    mapping(uint256 => Pixel) public pixels;

    /// @notice Emitted when a pixel's color is changed
    event PixelChanged(uint256 indexed pixelId, uint256 color);

    /// @notice Emitted when a user purchases PaintTokens
    event PaintTokensPurchased(address indexed buyer, uint256 amount, uint256 totalPrice);

    // Paint Token Variables
    uint256 public constant PAINT_TOKEN_PRICE = 30_000 gwei; // 0.00003 ether in wei
    uint256 public constant PAINT_TOKEN_SUPPLY = 10_000_000 * 10 ** 18; // Assuming 18 decimals
    uint256 private constant DECIMALS = 10 ** 18; // Token decimals

    PaintToken public paintToken;

    /// @notice Constructor that deploys the PaintToken contract and sets the initial owner
    /// @param initialOwner The address of the initial owner
    constructor(address initialOwner) Ownable(initialOwner) {
        // Deploy the PaintToken contract with the initial supply, owned by this contract
        paintToken = new PaintToken(PAINT_TOKEN_SUPPLY, address(this));
    }

    /// @notice Allows users to purchase PaintTokens by sending ETH
    /// @param amount The number of PaintTokens to purchase (without decimals)
    function buyPaintTokens(uint256 amount) public payable nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        uint256 totalPrice = PAINT_TOKEN_PRICE * amount;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        // Transfer PaintTokens to the buyer
        paintToken.transfer(msg.sender, amount * DECIMALS);

        // Emit event for token purchase
        emit PaintTokensPurchased(msg.sender, amount * DECIMALS, totalPrice);

        // Refund excess ETH, if any
        if (msg.value > totalPrice) {
            (bool success, ) = msg.sender.call{value: msg.value - totalPrice}("");
            require(success, "Refund failed");
        }
    }

    /// @notice Allows users to set the colors of multiple pixels on the canvas
    /// @param pixelIds An array of pixel IDs to set
    /// @param colors An array of colors corresponding to the pixel IDs
    function setPixelColors(uint256[] memory pixelIds, uint256[] memory colors) public nonReentrant {
        uint256 totalPixels = pixelIds.length;
        require(totalPixels > 0, "No pixels to set");
        require(totalPixels == colors.length, "Mismatched array lengths");
        require(totalPixels <= TOTAL_PIXELS, "Cannot change more than 100 pixels at once");

        // Use a fixed-size array to track duplicates (since TOTAL_PIXELS is 4096)
        bool[4096] memory pixelIdUsed;

        for (uint256 i = 0; i < totalPixels; i++) {
            uint256 pixelId = pixelIds[i];
            require(pixelId < TOTAL_PIXELS, "Invalid pixel ID");
            require(!pixelIdUsed[pixelId], "Duplicate pixel ID detected");
            pixelIdUsed[pixelId] = true;
        }

        // Calculate the total number of tokens required
        uint256 requiredTokens = totalPixels * DECIMALS;

        // Check if the user has enough PaintTokens
        require(paintToken.balanceOf(msg.sender) >= requiredTokens, "Insufficient Paint tokens");

        // Users must approve the canvas contract to burn their tokens
        paintToken.burnFrom(msg.sender, requiredTokens);

        // Set pixel colors and emit events
        for (uint256 i = 0; i < totalPixels; i++) {
            uint256 pixelId = pixelIds[i];
            uint256 color = colors[i];
            require(color <= 0xFFFFFF, "Invalid color value"); // Ensure color is a valid RGB value

            pixels[pixelId].color = color;
            emit PixelChanged(pixelId, color);
        }
    }

    /// @notice Retrieves the color of a specific pixel
    /// @param pixelId The ID of the pixel to retrieve
    /// @return The Pixel struct containing the color
    function getPixel(uint256 pixelId) public view returns (Pixel memory) {
        require(pixelId < TOTAL_PIXELS, "Invalid pixel ID");
        Pixel memory pixel = pixels[pixelId];
        if (pixel.color == 0) {
            pixel.color = 0xFFFFFF; // Default color (white) if not set
        }
        return pixel;
    }

    /// @notice Returns an array of all pixel colors
    /// @return An array of pixel colors
    function getAllPixels() public view returns (uint256[] memory) {
        uint256[] memory allPixels = new uint256[](TOTAL_PIXELS);
        for (uint256 i = 0; i < TOTAL_PIXELS; i++) {
            allPixels[i] = pixels[i].color;
        }
        return allPixels;
    }
    /// @notice Allows the owner to withdraw all ETH from the contract
    function withdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
