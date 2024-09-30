"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition } from "@headlessui/react";
import { ethers } from "ethers";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Image as ImageIcon, Info, Move, Paintbrush, ShoppingCart, ZoomIn, ZoomOut } from "lucide-react";
import { Address } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { Spinner } from "react-bootstrap";

const CANVAS_SIZE = 64;
const INITIAL_PIXEL_SIZE = 16;
const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE;

interface ToolButtonProps {
  onClick: () => void;
  isActive: boolean;
  icon: React.ElementType;
  label: string;
}

export default function CollaborativeArtCanvas() {
  const [selectedColor, setSelectedColor] = useState("#FF6B6B");
  const [selectedPixels, setSelectedPixels] = useState<Set<string>>(new Set());
  const [pixelSize, setPixelSize] = useState(INITIAL_PIXEL_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState("brush");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasData, setCanvasData] = useState<string[][]>(
    Array.from({ length: CANVAS_SIZE }, () => Array(CANVAS_SIZE).fill("#FFFFFF")),
  );
  const [activeTab, setActiveTab] = useState("color");
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(1);
  const [paintTokensToBuy, setPaintTokensToBuy] = useState(0);
  const { address } = useAccount();
  const [pixels, setPixels] = useState<number[]>(new Array(TOTAL_PIXELS).fill(0xffffff));
  const [pixelOwners, setPixelOwners] = useState<string[]>(new Array(TOTAL_PIXELS).fill(ethers.ZeroAddress));
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [imageCorners, setImageCorners] = useState<{ x: number; y: number }[]>([]);
  const [isImageMode, setIsImageMode] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [originalCanvasData, setOriginalCanvasData] = useState<string[][]>(
    Array.from({ length: CANVAS_SIZE }, () => Array(CANVAS_SIZE).fill("#FFFFFF")),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPainting, setIsPainting] = useState(false); // {{ New state for painting loading }}
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null); // {{ New state for hovered pixel }}

  const { data: collaborativeArtCanvas } = useScaffoldContract({
    contractName: "CollaborativeArtCanvas",
  });

  const { data: allPixels } = useScaffoldReadContract<"CollaborativeArtCanvas", "getAllPixels">({
    contractName: "CollaborativeArtCanvas",
    functionName: "getAllPixels"
  });

  const { data: paintTokenAddress } = useScaffoldReadContract<"CollaborativeArtCanvas", "paintToken">({
    contractName: "CollaborativeArtCanvas",
    functionName: "paintToken",
  });

  const { data: allowance } = useScaffoldReadContract<"PaintToken", "allowance">({
    contractName: "PaintToken",
    functionName: "allowance",
    args: [address as Address, ( collaborativeArtCanvas)?.address],
  });


  const { data: balanceOf } = useScaffoldReadContract<"PaintToken", "balanceOf">({
    contractName: "PaintToken",
    functionName: "balanceOf",
    args: [address as Address],
  });
  const { writeContractAsync: approve } = useScaffoldWriteContract("PaintToken");


  const { data: paintDecimals } = useScaffoldReadContract<"PaintToken", "decimals">({
    contractName: "PaintToken",
    functionName: "decimals"
  });

  const { writeContractAsync: buyPaintTokens } = useScaffoldWriteContract("CollaborativeArtCanvas");
  const { writeContractAsync: setPixelColors } = useScaffoldWriteContract("CollaborativeArtCanvas", {
    mutation: {
    },
  });

  useEffect(() => {
    if (allPixels !== undefined) {
      console.log("Updating canvas data");
      const updatedCanvasData = Array.from({ length: CANVAS_SIZE }, (_, y) =>
        Array.from({ length: CANVAS_SIZE }, (_, x) => {
          const pixelId = Number(y * CANVAS_SIZE + x);
          const color = allPixels[pixelId];
          return color === 0n ? "#FFFFFF" : `#${color.toString(16).padStart(6, "0")}`;
        })
      );
      setCanvasData(updatedCanvasData);
      setIsLoading(false);
    }
  }, [allPixels]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setLastMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Initialize canvasData with originalCanvasData
    setCanvasData(originalCanvasData);
  }, [originalCanvasData]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        ctx.fillStyle = canvasData[y][x];
        ctx.fillRect(x * pixelSize + panOffset.x, y * pixelSize + panOffset.y, pixelSize, pixelSize);
      }
    }

    // Draw grid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    for (let i = 0; i <= CANVAS_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize + panOffset.x, panOffset.y);
      ctx.lineTo(i * pixelSize + panOffset.x, CANVAS_SIZE * pixelSize + panOffset.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(panOffset.x, i * pixelSize + panOffset.y);
      ctx.lineTo(CANVAS_SIZE * pixelSize + panOffset.x, i * pixelSize + panOffset.y);
      ctx.stroke();
    }

    // Draw selected image corners
    if (isImageMode && imageCorners.length > 0) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
      imageCorners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(
          corner.x * pixelSize + panOffset.x + pixelSize / 2,
          corner.y * pixelSize + panOffset.y + pixelSize / 2,
          pixelSize / 4,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    }

    // Draw selected image area
    if (imageCorners.length === 2) {
      const [corner1, corner2] = imageCorners;
      const x = Math.min(corner1.x, corner2.x) * pixelSize + panOffset.x;
      const y = Math.min(corner1.y, corner2.y) * pixelSize + panOffset.y;
      const width = (Math.abs(corner2.x - corner1.x) + 1) * pixelSize;
      const height = (Math.abs(corner2.y - corner1.y) + 1) * pixelSize;

      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.fillRect(x, y, width, height);
    }

    // Draw selected image area while selecting the second corner
    if (isImageMode && imageCorners.length === 1) {
      const [corner1] = imageCorners;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = lastMousePosition.x - rect.left;
      const mouseY = lastMousePosition.y - rect.top;

      const corner2 = { x: Math.floor((mouseX - panOffset.x) / pixelSize), y: Math.floor((mouseY - panOffset.y) / pixelSize) };
      const x = Math.min(corner1.x, corner2.x) * pixelSize + panOffset.x;
      const y = Math.min(corner1.y, corner2.y) * pixelSize + panOffset.y;
      const width = (Math.abs(corner2.x - corner1.x) + 1) * pixelSize;
      const height = (Math.abs(corner2.y - corner1.y) + 1) * pixelSize;

      ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
      ctx.fillRect(x, y, width, height);
    }

    // Draw hovered pixel coordinates
    if (hoveredPixel) {
      const { x, y } = hoveredPixel;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x * pixelSize + panOffset.x, y * pixelSize + panOffset.y, pixelSize, pixelSize);
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText(`(${x}, ${y})`, x * pixelSize + panOffset.x + 2, y * pixelSize + panOffset.y + 12);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [canvasData, pixelSize, panOffset, imageCorners, hoveredPixel]);

  const paintPixel = (x: number, y: number) => {
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      const key = `${x},${y}`;
      if (!selectedPixels.has(key)) {
        setCanvasData(prevData => {
          const newData = [...prevData];
          newData[y] = [...newData[y]];
          newData[y][x] = selectedColor;
          return newData;
        });
        setSelectedPixels(prev => new Set(prev).add(key));
      }
    }
  };

  const getPixelCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((event.clientX - rect.left) * scaleX - panOffset.x) / pixelSize);
    const y = Math.floor(((event.clientY - rect.top) * scaleY - panOffset.y) / pixelSize);

    return { x, y };
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPixelCoordinates(event);

    if (isDragging) {
      setPanOffset({
        x: event.clientX - startPan.x,
        y: event.clientY - startPan.y,
      });
    } else if (isMouseDown && tool === "brush") {
      paintPixel(x, y);
    }

    if (isImageMode) {
      drawCanvas();
    }

    // Update hovered pixel coordinates
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      setHoveredPixel({ x, y });
    } else {
      setHoveredPixel(null);
    }
  };

  const handlePixelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isImageMode) return;

    const { x, y } = getPixelCoordinates(event);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      const key = `${x},${y}`;
      const isPixelSelected = selectedPixels.has(key);

      if (tool === "brush") {
        if (!isPixelSelected) {
          // Paint the pixel and add it to selection
          paintPixel(x, y);
        }
      } else if (tool === "select") {
        setSelectedPixels(prev => {
          const newSelected = new Set(prev);
          if (newSelected.has(key)) {
            newSelected.delete(key);
          } else {
            newSelected.add(key);
          }
          return newSelected;
        });
      }
    }
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isImageMode) return;
    setIsMouseDown(true);
    if (tool === "pan") {
      setIsDragging(true);
      setStartPan({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    } else if (tool === "brush") {
      handlePixelClick(event);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
    setIsDragging(false);
  };

  const handleZoom = (direction: number) => {
    setPixelSize(prevSize => Math.max(4, Math.min(32, prevSize + direction * 2)));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      setUploadedImage(img);
      setImageCorners([]);
      setIsImageMode(true);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleImageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!uploadedImage || !isImageMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - panOffset.x) / pixelSize);
    const y = Math.floor((event.clientY - rect.top - panOffset.y) / pixelSize);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      setImageCorners(prev => {
        if (prev.length === 0) {
          return [{ x, y }];
        } else if (prev.length === 1) {
          const [corner1] = prev;
          // Ensure corners are ordered min to max
          const minX = Math.min(corner1.x, x);
          const minY = Math.min(corner1.y, y);
          const maxX = Math.max(corner1.x, x);
          const maxY = Math.max(corner1.y, y);
          return [{ x: minX, y: minY }, { x: maxX, y: maxY }];
        } else {
          return [{ x, y }];
        }
      });
    }
  };

  const applyImageToCanvas = () => {
    if (!uploadedImage || imageCorners.length !== 2) return;

    const [corner1, corner2] = imageCorners;
    const minX = Math.min(corner1.x, corner2.x);
    const minY = Math.min(corner1.y, corner2.y);
    const maxX = Math.max(corner1.x, corner2.x);
    const maxY = Math.max(corner1.y, corner2.y);
    const imageWidth = maxX - minX + 1;
    const imageHeight = maxY - minY + 1;

    // Draw the image onto a temporary canvas to get pixel data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      uploadedImage,
      0,
      0,
      uploadedImage.width,
      uploadedImage.height,
      0,
      0,
      imageWidth,
      imageHeight
    );

    const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
    const newCanvasData = [...canvasData];
    const newSelectedPixels: string[] = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        if (!selectedPixels.has(key)) {
          const pixelIndex = ((y - minY) * imageWidth + (x - minX)) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          newCanvasData[y][x] = `rgb(${r},${g},${b})`;
          newSelectedPixels.push(key);
        }
      }
    }

    setCanvasData(newCanvasData);
    setSelectedPixels(prev => {
      const updated = new Set(prev);
      newSelectedPixels.forEach(key => updated.add(key));
      return updated;
    });
    setUploadedImage(null);
    setImageCorners([]);
    setIsImageMode(false);
  };

  const handlePurchasePixels = async () => {
    console.log("handlePurchasePixels called");
    if (selectedPixels.size === 0) {
      console.log("No pixels selected");
      notification.error("Please select at least one pixel to purchase.");
      return;
    }

    const userBalance = balanceOf ? BigInt(balanceOf) : BigInt(0);
    const requiredTokens = BigInt(selectedPixels.size);

    console.log("User Paint Token balance:", userBalance.toString());
    console.log("Required Paint Tokens:", requiredTokens.toString());

    const decimals = await paintDecimals!;
    console.log("Decimals:", decimals);

    const userBalanceWithDecimals = userBalance;
    const requiredTokensWithDecimals = requiredTokens * BigInt(10) ** BigInt(decimals);

    console.log("User balance with decimals:", userBalanceWithDecimals.toString());
    console.log("Required tokens with decimals:", requiredTokensWithDecimals.toString());

    if (userBalanceWithDecimals >= requiredTokensWithDecimals) {
      console.log("User has enough tokens, proceeding to paint");
      setPurchaseStep(2);
    } else {
      console.log("User needs to buy more tokens");
      setPaintTokensToBuy(Number((requiredTokensWithDecimals - userBalanceWithDecimals) / BigInt(10) ** BigInt(decimals)));
      setPurchaseStep(1);
    }

    setIsPurchaseModalOpen(true);
    console.log("Purchase modal state:", isPurchaseModalOpen);
    console.log("Purchase step:", purchaseStep);
  };

  const handleBuyPaintTokens = async () => {
    try {
      await buyPaintTokens({
        functionName: "buyPaintTokens",
        args: [BigInt(paintTokensToBuy)],
        value: BigInt(Math.floor(paintTokensToBuy * 0.00003 * 10 ** 18)),
      });
      setPurchaseStep(2);
      notification.success("Paint tokens purchased successfully!");
    } catch (error: any) {
      console.error(error);
      notification.error(error?.reason || "Failed to buy Paint tokens");
    }
  };

  const handlePaintPixels = async () => {
    try {
      console.log("handlePaintPixels called");
      const tokenIds = Array.from(selectedPixels).map(key => {
        const [x, y] = key.split(",").map(Number);
        return BigInt(y * CANVAS_SIZE + x);
      });
      const colors = Array.from(selectedPixels).map(key => {
        const [x, y] = key.split(",").map(Number);
        let colorStr = canvasData[y][x];
        let hexColor = '';
      
        if (colorStr.startsWith('#')) {
          hexColor = colorStr.substring(1);
        } else if (colorStr.startsWith('rgb')) {
          const rgbValues = colorStr.match(/\d+/g);
          if (rgbValues && rgbValues.length === 3) {
            const [r, g, b] = rgbValues.map(n => parseInt(n, 10));
            const clamp = (num: number) => Math.max(0, Math.min(255, num));
            const rHex = clamp(r).toString(16).padStart(2, '0');
            const gHex = clamp(g).toString(16).padStart(2, '0');
            const bHex = clamp(b).toString(16).padStart(2, '0');
            hexColor = `${rHex}${gHex}${bHex}`;
          } else {
            hexColor = 'ffffff';
          }
        } else {
          hexColor = 'ffffff';
        }
      
        return BigInt(`0x${hexColor}`);
      });

      console.log("Token IDs:", tokenIds);
      console.log("Colors:", colors);

      // Check if the user has approved enough tokens
      const requiredTokens = BigInt(selectedPixels.size);
      const decimals = await paintDecimals!;
      const requiredTokensWithDecimals = requiredTokens * BigInt(10) ** BigInt(decimals);

      console.log("Required tokens:", requiredTokensWithDecimals.toString());
      console.log("Current allowance:", allowance?.toString());

      if (allowance! < requiredTokensWithDecimals) {
        console.log("Approving tokens");
        // User needs to approve more tokens
        const approveTx = await approve({
          functionName: "approve",
          args: [collaborativeArtCanvas!.address, requiredTokensWithDecimals],
        });
        console.log("Approve transaction:", approveTx);
        // Wait for the transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds
      }

      console.log("Setting pixel colors");
      // Call the setPixelColors function
      const tx = await setPixelColors({
        functionName: "setPixelColors",
        args: [tokenIds, colors],
      });
      console.log("Transaction:", tx);
      // Wait for the transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds

      notification.success("Pixels painted successfully!");
      setSelectedPixels(new Set());
      setIsPurchaseModalOpen(false);
      setPurchaseStep(1);
    } catch (error: any) {
      console.error("Error in handlePaintPixels:", error);
      notification.error(error?.reason || "Failed to paint pixels");
    }
  };

  const handlePixelHover = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isImageMode || imageCorners.length === 2) return;
    // This can be used to provide additional feedback if needed
  };

  const ToolButton = ({ onClick, isActive, icon: Icon, label }: ToolButtonProps) => (
    <button
      onClick={onClick}
      className={`btn ${
        isActive ? "bg-blue-600 text-white" : "bg-white bg-opacity-20 text-white hover:bg-white hover:bg-opacity-30"
      } m-1 border-0 transition-all duration-200 shadow-md`}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </button>
  );

  const clearCanvas = () => {
    setCanvasData(prevData => {
      const newData = prevData.map((row, y) =>
        row.map((_, x) => {
          const key = `${x},${y}`;
          return selectedPixels.has(key) ? originalCanvasData[y][x] : prevData[y][x];
        })
      );
      return newData;
    });
    setSelectedPixels(new Set());
  };

  const getGasPrice = async () => {
    // Implement this to get the current gas price
    // You can use ethers.js or web3.js to get this information
    // For example, with ethers.js:
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    // return await provider.getGasPrice();
  };

  const getUserEthBalance = async () => {
    // Implement this to get the user's ETH balance
    // You can use ethers.js or web3.js to get this information
    // For example, with ethers.js:
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    // const balance = await provider.getBalance(userAddress);
    // return balance;
  };

  return (
    <div className="flex flex-col lg:flex-row p-4 gap-4 bg-[#34495e] min-h-screen">
      {isLoading ? (
        <div className="flex justify-center items-center h-screen w-full">
          <div className="text-center">
            <Spinner animation="border" role="status" className="mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white">Loading...</h2>
          </div>
        </div>
      ) : (
        <>
          <motion.div
            className="flex-grow flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-[#2c3e50] p-4 rounded-lg shadow-lg mb-4 flex flex-wrap justify-between">
              <div className="flex flex-wrap">
                <ToolButton onClick={() => setTool("brush")} isActive={tool === "brush"} icon={Paintbrush} label="Brush" />
                <ToolButton onClick={() => setTool("pan")} isActive={tool === "pan"} icon={Move} label="Pan" />
                <ToolButton onClick={() => handleZoom(1)} isActive={false} icon={ZoomIn} label="Zoom In" />
                <ToolButton onClick={() => handleZoom(-1)} isActive={false} icon={ZoomOut} label="Zoom Out" />
              </div>
              <div className="flex justify-center space-x-2">
                {/* ... existing buttons ... */}
              </div>
            </div>
            <div className="bg-[#2c3e50] p-4 rounded-lg shadow-lg flex-grow relative overflow-hidden">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE * pixelSize}
                height={CANVAS_SIZE * pixelSize}
                className="cursor-crosshair mx-auto"
                style={{
                  width: `${CANVAS_SIZE * pixelSize}px`,
                  height: `${CANVAS_SIZE * pixelSize}px`,
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 200px)',
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => {
                  handleCanvasMouseUp();
                  drawCanvas();
                }}
                onClick={isImageMode ? handleImageClick : handlePixelClick}
              />
            </div>
            {isImageMode && imageCorners.length < 2 && (
              <div className="mt-4 text-center bg-base-100 bg-opacity-80 p-4 rounded-lg shadow-lg">
                <p className="text-lg font-semibold text-primary mb-2">Select two corners of the image</p>
                <p className="text-base-content">Click on the canvas to choose the corners</p>
              </div>
            )}
          </motion.div>

          <motion.div
            className="w-full lg:w-80 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-[#2c3e50] rounded-lg shadow-lg overflow-hidden">
              <div className="tabs tabs-boxed bg-transparent">
                <a
                  className={`tab flex-1 ${activeTab === "color" ? "bg-blue-600 text-white" : "text-white"}`}
                  onClick={() => setActiveTab("color")}
                >
                  Color
                </a>
                <a
                  className={`tab flex-1 ${activeTab === "image" ? "bg-blue-600 text-white" : "text-white"}`}
                  onClick={() => setActiveTab("image")}
                >
                  Image
                </a>
              </div>
              <div className="p-4">
                {activeTab === "color" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-white">Color Picker</h2>
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={e => setSelectedColor(e.target.value)}
                        className="w-10 h-10 overflow-hidden cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedColor}
                        onChange={e => setSelectedColor(e.target.value)}
                        className="input input-bordered w-full text-white bg-blue-800 bg-opacity-50"
                      />
                    </div>
                  </div>
                )}
                {activeTab === "image" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-white">Upload Image</h2>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="file-input file-input-bordered w-full bg-blue-800 bg-opacity-50 text-white"
                    />
                    <p className="text-sm text-white mt-2">
                      Upload an image and select two corners to apply it to the canvas.
                    </p>
                    {uploadedImage && (
                      <div className="mt-4">
                        <img
                          src={uploadedImage.src}
                          alt="Uploaded"
                          style={{ maxWidth: "100%", maxHeight: "200px" }}
                        />
                        {imageCorners.length === 2 ? (
                          <button className="btn btn-primary mt-4" onClick={applyImageToCanvas}>
                            Apply Image
                          </button>
                        ) : (
                          <p className="text-white mt-2">Select two corners on the canvas to position the image</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {selectedPixels.size > 0 && (
                <motion.div
                  className="bg-[#2c3e50] p-4 rounded-lg shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-semibold mb-4 text-white">Selected Pixels</h2>
                  <p className="text-white">{selectedPixels.size} pixel(s) selected</p>
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      className={`btn btn-primary w-full ${isPainting ? "loading" : ""}`}
                      onClick={handlePaintPixels}
                      disabled={isPainting}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {isPainting ? "Painting..." : "Purchase Selected"}
                    </button>
                    <button className="btn btn-outline btn-error w-full" onClick={clearCanvas}>
                      Clear Canvas
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="btn btn-outline btn-primary w-full text-white" onClick={() => setIsModalOpen(true)}>
              <Eye className="w-4 h-4 mr-2" />
              How It Works
            </button>

            <Transition appear show={isModalOpen} as={Fragment}>
              <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                  <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-300"
                      enterFrom="opacity-0 scale-95"
                      enterTo="opacity-100 scale-100"
                      leave="ease-in duration-200"
                      leaveFrom="opacity-100 scale-100"
                      leaveTo="opacity-0 scale-95"
                    >
                      <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-base-200 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-base-content">
                          How It Works
                        </Dialog.Title>
                        <div className="mt-2">
                          <p className="text-sm text-base-content opacity-80">
                            1. Select a color or upload an image.
                            <br />
                            2. Click on the canvas to paint pixels.
                            <br />
                            3. Use the select tool to choose multiple pixels.
                            <br />
                            4. Purchase pixels to own them on the blockchain.
                            <br />
                            5. Collaborate with others to create amazing art!
                          </p>
                        </div>

                        <div className="mt-4">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setIsModalOpen(false)}
                          >
                            Got it, thanks!
                          </button>
                        </div>
                      </Dialog.Panel>
                    </Transition.Child>
                  </div>
                </div>
              </Dialog>
            </Transition>
          </motion.div>
          <Transition appear show={isPurchaseModalOpen} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={() => setIsPurchaseModalOpen(false)}>
              <div className="min-h-screen px-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <DialogBackdrop className="fixed inset-0 bg-black opacity-30" />
                </Transition.Child>

                <span className="inline-block h-screen align-middle" aria-hidden="true">
                  &#8203;
                </span>

                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                    <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      {purchaseStep === 1 ? "Buy Paint Tokens" : "Paint Pixels"}
                    </DialogTitle>
                    <div className="mt-2">
                      {purchaseStep === 1 ? (
                        <p className="text-sm text-gray-500">
                          You need to buy {paintTokensToBuy} Paint tokens to paint the selected pixels.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          You have enough Paint tokens. Click the button below to paint the selected pixels.
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      {purchaseStep === 1 ? (
                        <button
                          type="button"
                          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                          onClick={handleBuyPaintTokens}
                        >
                          Buy Paint Tokens
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                          onClick={handlePaintPixels}
                        >
                          Paint Pixels
                        </button>
                      )}
                    </div>
                  </DialogPanel>
                </Transition.Child>
              </div>
            </Dialog>
          </Transition>
        </>
      )}
    </div>
  );
}