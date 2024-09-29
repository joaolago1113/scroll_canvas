// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CollaborativeArtCanvas is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant CANVAS_WIDTH = 32;
    uint256 public constant CANVAS_HEIGHT = 32;
    uint256 public constant TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;

    struct Pixel {
        uint256 color;
        address owner;
    }

    mapping(uint256 => Pixel) public pixels;
    uint256 public pixelPrice = 0.01 ether;

    event PixelChanged(uint256 indexed tokenId, uint256 color, address owner);

    constructor(address initialOwner) ERC721("CollaborativeArtCanvas", "CAC") Ownable() {
        _transferOwnership(initialOwner);
        for (uint256 i = 0; i < TOTAL_PIXELS; i++) {
            pixels[i] = Pixel(0xFFFFFF, address(0));
        }
    }

    function buyPixel(uint256 tokenId) public payable {
        require(tokenId < TOTAL_PIXELS, "Invalid pixel ID");
        require(msg.value >= pixelPrice, "Insufficient payment");
        require(pixels[tokenId].owner == address(0), "Pixel already owned");

        _tokenIds.increment();
        _safeMint(msg.sender, tokenId);
        pixels[tokenId].owner = msg.sender;

        emit PixelChanged(tokenId, pixels[tokenId].color, msg.sender);
    }

    function setPixelColor(uint256 tokenId, uint256 color) public {
        require(_exists(tokenId), "ERC721: invalid token ID");
        require(ownerOf(tokenId) == msg.sender, "Not owner of this pixel");
        pixels[tokenId].color = color;
        emit PixelChanged(tokenId, color, msg.sender);
    }

    function getPixel(uint256 tokenId) public view returns (Pixel memory) {
        require(tokenId < TOTAL_PIXELS, "Invalid pixel ID");
        return pixels[tokenId];
    }

    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        require(_exists(tokenId), "ERC721: invalid token ID");
        return pixels[tokenId].owner;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }

    function setPixelPrice(uint256 newPrice) public onlyOwner {
        pixelPrice = newPrice;
    }

    function _exists(uint256 tokenId) internal view virtual override returns (bool) {
        return tokenId < TOTAL_PIXELS && pixels[tokenId].owner != address(0);
    }
}