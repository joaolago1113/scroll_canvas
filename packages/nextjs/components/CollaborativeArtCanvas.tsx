'use client';

import React, { useState, useRef, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paintbrush,
  Image as ImageIcon,
  Info,
  ZoomIn,
  ZoomOut,
  Move,
  Eye,
  ShoppingCart,
} from 'lucide-react';
import { useScaffoldWriteContract, useScaffoldContract, useScaffoldReadContract } from '~~/hooks/scaffold-eth';
import { notification } from '~~/utils/scaffold-eth';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition,  } from '@headlessui/react';
import { useAccount } from "wagmi";
import { Address } from 'viem';
import { ethers } from 'ethers';

const CANVAS_SIZE = 64;
const INITIAL_PIXEL_SIZE = 16;
const TOTAL_PIXELS = CANVAS_SIZE * CANVAS_SIZE;

export default function CollaborativeArtCanvas() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedPixels, setSelectedPixels] = useState<{ x: number; y: number }[]>([]);
  const [pixelSize, setPixelSize] = useState(INITIAL_PIXEL_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState('brush');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasData, setCanvasData] = useState<string[][]>(
    Array.from({ length: CANVAS_SIZE }, () => Array(CANVAS_SIZE).fill('#FFFFFF'))
  );
  const [activeTab, setActiveTab] = useState('color');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(1);
  const [paintTokensToBuy, setPaintTokensToBuy] = useState(0);
  const { address } = useAccount();
  const [pixels, setPixels] = useState<number[]>(new Array(TOTAL_PIXELS).fill(0xffffff));
  const [pixelOwners, setPixelOwners] = useState<string[]>(new Array(TOTAL_PIXELS).fill(ethers.ZeroAddress));

  const { data: collaborativeArtCanvas } = useScaffoldContract({
    contractName: 'CollaborativeArtCanvas',
  });

  const { data: paintTokenAddress } = useScaffoldReadContract<"CollaborativeArtCanvas", "paintToken">({
    contractName: "CollaborativeArtCanvas",
    functionName: "paintToken",
  });

  const { data: balanceOf } = useScaffoldReadContract<"PaintToken", "balanceOf">({
    contractName: "PaintToken",
    functionName: "balanceOf",
    args: [address as Address],
  });

  const { writeContractAsync: buyPaintTokens } = useScaffoldWriteContract("CollaborativeArtCanvas");
  const { writeContractAsync: setPixelColors } = useScaffoldWriteContract("CollaborativeArtCanvas");

  useEffect(() => {
    drawCanvas();
  }, [canvasData, pixelSize, panOffset]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        ctx.fillStyle = canvasData[y][x];
        ctx.fillRect(
          x * pixelSize + panOffset.x,
          y * pixelSize + panOffset.y,
          pixelSize,
          pixelSize
        );
      }
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
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
  };

  const paintPixel = (x: number, y: number) => {
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      const newCanvasData = [...canvasData];
      newCanvasData[y][x] = selectedColor;
      setCanvasData(newCanvasData);
      setSelectedPixels(prev => [...prev, { x, y }]);
    }
  };

  const handlePixelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const x = Math.floor((canvasX - panOffset.x) / pixelSize);
    const y = Math.floor((canvasY - panOffset.y) / pixelSize);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      if (tool === 'brush') {
        // Paint the pixel
        const newCanvasData = [...canvasData];
        newCanvasData[y][x] = selectedColor;
        setCanvasData(newCanvasData);
        setSelectedPixels(prev => [...prev, { x, y }]);
      } else if (tool === 'select') {
        setSelectedPixels(prev => [...prev, { x, y }]);
      }
    }
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    if (tool === 'pan') {
      setIsDragging(true);
      setStartPan({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    } else if (tool === 'brush') {
      const { x, y } = getPixelCoordinates(event);
      paintPixel(x, y);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: event.clientX - startPan.x,
        y: event.clientY - startPan.y
      });
    } else if (isMouseDown && tool === 'brush') {
      const { x, y } = getPixelCoordinates(event);
      paintPixel(x, y);
    }
    handlePixelHover(event);
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
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_SIZE;
        tempCanvas.height = CANVAS_SIZE;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        const newCanvasData = [...canvasData];
        for (let y = 0; y < CANVAS_SIZE; y++) {
          for (let x = 0; x < CANVAS_SIZE; x++) {
            const i = (y * CANVAS_SIZE + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            newCanvasData[y][x] = `rgb(${r},${g},${b})`;
          }
        }
        setCanvasData(newCanvasData);
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handlePurchasePixels = async () => {
    if (selectedPixels.length === 0) return;
    setPaintTokensToBuy(selectedPixels.length);
    setIsPurchaseModalOpen(true);
  };

  const handleBuyPaintTokens = async () => {
    try {
      await buyPaintTokens({
        functionName: "buyPaintTokens",
        args: [BigInt(paintTokensToBuy)],
        value: BigInt(Math.floor(paintTokensToBuy * 0.00003 * 10 ** 18)),
      });
      setPurchaseStep(2);
    } catch (error: any) {
      console.error(error);
      notification.error(error?.reason || "Failed to buy Paint tokens");
    }
  };

  const handlePaintPixels = async () => {
    try {
      const tokenIds = selectedPixels.map(pixel => pixel.y * CANVAS_SIZE + pixel.x);
      const colors = selectedPixels.map(pixel => parseInt(canvasData[pixel.y][pixel.x].slice(1), 16));

      await setPixelColors({
        functionName: "setPixelColors",
        args: [tokenIds.map(BigInt), colors.map(BigInt)],
      });

      notification.success("Pixels painted successfully!");
      setSelectedPixels([]);
      setIsPurchaseModalOpen(false);
      setPurchaseStep(1);
    } catch (error: any) {
      console.error(error);
      notification.error(error?.reason || "Failed to paint pixels");
    }
  };

  const handlePixelHover = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - panOffset.x) / pixelSize);
    const y = Math.floor((event.clientY - rect.top - panOffset.y) / pixelSize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawCanvas(); // Redraw the canvas to clear previous hover effects

    // Draw a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Dark overlay
    ctx.fillRect(
      x * pixelSize + panOffset.x,
      y * pixelSize + panOffset.y,
      pixelSize,
      pixelSize
    );

    // Draw a contrasting border
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Bright yellow border
    ctx.lineWidth = 2;
    ctx.strokeRect(
      x * pixelSize + panOffset.x,
      y * pixelSize + panOffset.y,
      pixelSize,
      pixelSize
    );

    // Create a grey bubble for coordinates
    const bubbleWidth = 60;
    const bubbleHeight = 25;
    const bubbleX = (x + 1) * pixelSize + panOffset.x - bubbleWidth;
    const bubbleY = y * pixelSize + panOffset.y;

    // Draw bubble background
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)'; // Semi-transparent grey
    ctx.beginPath();
    ctx.moveTo(bubbleX, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();

    // Display coordinates with better visibility
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `(${x}, ${y})`,
      bubbleX + bubbleWidth / 2,
      bubbleY + bubbleHeight / 2
    );
  };

  const getPixelCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - panOffset.x) / pixelSize);
    const y = Math.floor((event.clientY - rect.top - panOffset.y) / pixelSize);
    return { x, y };
  };

  const ToolButton = ({
    onClick,
    isActive,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className={`btn ${isActive ? 'btn-primary' : 'btn-outline'} m-1`}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline ml-2">{label}</span>
    </button>
  );

  const clearCanvas = async () => {
    const pixelsToClear = pixels.map((_, index) => index).filter(index => pixelOwners[index] === address);
    const colors = new Array(pixelsToClear.length).fill(0xffffff);

    await setPixelColors({
      functionName: "setPixelColors",
      args: [pixelsToClear.map(BigInt), colors.map(BigInt)],
    });

    setPixels(prevPixels => prevPixels.map((pixel, index) => (pixelsToClear.includes(index) ? 0xffffff : pixel)));
    setPixelOwners(prevOwners => prevOwners.map((owner, index) => (pixelsToClear.includes(index) ? ethers.ZeroAddress : owner)));
  };

  return (
    <div className="flex flex-col lg:flex-row p-4 gap-4">
      <motion.div 
        className="flex-grow flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-base-200 p-4 rounded-lg shadow-lg mb-4 flex flex-wrap justify-between">
          <div className="flex flex-wrap">
            <ToolButton
              onClick={() => setTool('brush')}
              isActive={tool === 'brush'}
              icon={Paintbrush}
              label="Brush"
            />
            <ToolButton
              onClick={() => setTool('select')}
              isActive={tool === 'select'}
              icon={Info}
              label="Select"
            />
            <ToolButton
              onClick={() => setTool('pan')}
              isActive={tool === 'pan'}
              icon={Move}
              label="Pan"
            />
            <ToolButton
              onClick={() => handleZoom(1)}
              isActive={false}
              icon={ZoomIn}
              label="Zoom In"
            />
            <ToolButton
              onClick={() => handleZoom(-1)}
              isActive={false}
              icon={ZoomOut}
              label="Zoom Out"
            />
          </div>
          <div className="flex justify-center space-x-2">
            {/* ... existing buttons ... */}
            <button
              className={`btn btn-primary btn-sm ${Number(selectedColor) === 0xffffff ? "btn-active" : ""}`}
              onClick={clearCanvas}
            >
              Clear Canvas
            </button>
          </div>
        </div>
        <div className="bg-base-200 p-4 rounded-lg shadow-lg flex-grow relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * pixelSize}
            height={CANVAS_SIZE * pixelSize}
            className="cursor-crosshair"
            style={{
              width: `${CANVAS_SIZE * pixelSize}px`,
              height: `${CANVAS_SIZE * pixelSize}px`,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => {
              handleCanvasMouseUp();
              drawCanvas();
            }}
          />
        </div>
      </motion.div>

      <motion.div 
        className="w-full lg:w-80 space-y-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="tabs tabs-boxed bg-base-300">
          <a
            className={`tab ${activeTab === 'color' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('color')}
          >
            Color
          </a>
          <a
            className={`tab ${activeTab === 'image' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            Image
          </a>
        </div>
        <div className="bg-base-200 p-4 rounded-lg shadow-lg">
          {activeTab === 'color' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-base-content">Color Picker</h2>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="input input-bordered w-full text-base-content"
                />
              </div>
            </div>
          )}
          {activeTab === 'image' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-primary">Upload Image</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input file-input-bordered w-full"
              />
              <p className="text-sm text-base-content mt-2">
                Upload an image to paint multiple pixels at once.
              </p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedPixels.length > 0 && (
            <motion.div 
              className="bg-base-200 p-4 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-primary">Selected Pixels</h2>
              <p className="text-base-content">{selectedPixels.length} pixel(s) selected</p>
              <button 
                className="btn btn-primary w-full mt-4" 
                onClick={handlePurchasePixels}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Purchase Selected Pixels
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          className="btn btn-outline w-full"
          onClick={() => setIsModalOpen(true)}
        >
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
              <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-base-100 p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-primary"
                    >
                      How It Works
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-base-content">
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
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsPurchaseModalOpen(false)}
        >
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
                  {purchaseStep === 1 ? 'Buy Paint Tokens' : 'Paint Pixels'}
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
    </div>
  );
}