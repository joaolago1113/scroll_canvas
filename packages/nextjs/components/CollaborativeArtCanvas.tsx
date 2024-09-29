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
import { useScaffoldWriteContract, useScaffoldContract } from '~~/hooks/scaffold-eth';
import { notification } from '~~/utils/scaffold-eth';
import { Dialog, Transition } from '@headlessui/react';

const CANVAS_SIZE = 64;
const INITIAL_PIXEL_SIZE = 16;

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
  const [selectedPixel, setSelectedPixel] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Get the contract data
  const { data: collaborativeArtCanvas, isLoading: isCanvasLoading } = useScaffoldContract({
    contractName: 'CollaborativeArtCanvas',
  });

  // Set up the write contract hook for buying pixels
  const { writeContractAsync: buyPixel } = useScaffoldWriteContract("CollaborativeArtCanvas");

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

  const handlePixelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - panOffset.x) / pixelSize);
    const y = Math.floor((event.clientY - rect.top - panOffset.y) / pixelSize);
    const pixelId = y * CANVAS_SIZE + x;

    setSelectedPixel(pixelId);
    // Implement fetching pixel owner logic if needed
  };

  const handleBuyPixel = async () => {
    if (selectedPixel === null || !collaborativeArtCanvas) return;
    try {
      const hash = await buyPixel({
        functionName: "buyPixel",
        args: [BigInt(selectedPixel)],
        value: BigInt("10000000000000000"), // 0.01 ETH
      });
      
      if (hash) {
        setTxHash(hash as string);
        notification.info("Transaction submitted. Awaiting confirmation...");
      } else {
        setTxHash(undefined);
        notification.error("Failed to receive transaction hash.");
      }
    } catch (error: any) {
      console.error(error);
      notification.error(error?.reason || "Failed to buy pixel");
    }
  };

  const handleSetColor = async () => {
    // Implement set color logic
  };

  const handlePurchasePixels = async () => {
    if (selectedPixels.length === 0) return;

    try {
      for (const pixel of selectedPixels) {
        const pixelId = pixel.y * CANVAS_SIZE + pixel.x;
        await buyPixel({
          functionName: "buyPixel",
          args: [BigInt(pixelId)],
          value: BigInt("10000000000000000"), // 0.01 ETH per pixel
        });
      }
      notification.success("Selected pixels purchased successfully!");
      setSelectedPixels([]);
    } catch (error: any) {
      console.error(error);
      notification.error(error?.reason || "Failed to purchase selected pixels");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new window.Image();
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

  const handleZoom = (direction: number) => {
    setPixelSize(prevSize => Math.max(4, Math.min(32, prevSize + direction * 2)));
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setStartPan({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: event.clientX - startPan.x,
        y: event.clientY - startPan.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const ToolButton = ({
    onClick,
    isActive,
    icon: Icon,
    label,
    className,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ElementType;
    label: string;
    className?: string;
  }) => (
    <div className="tooltip tooltip-bottom" data-tip={label}>
      <button
        onClick={onClick}
        className={`btn ${className} ${isActive ? 'btn-primary' : 'btn-outline'}`}
      >
        <Icon className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </div>
  );

  return (
    <div className="flex-grow flex flex-col lg:flex-row p-4 sm:p-8 gap-4 sm:gap-8">
      <motion.div 
        className="flex-grow flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white bg-opacity-80 backdrop-blur-lg p-4 rounded-lg shadow-lg mb-4 flex flex-wrap justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <ToolButton
              onClick={() => setTool('brush')}
              isActive={tool === 'brush'}
              icon={Paintbrush}
              label="Brush"
              className="bg-blue-500 hover:bg-blue-600 border-blue-400"
            />
            <ToolButton
              onClick={() => setTool('select')}
              isActive={tool === 'select'}
              icon={Info}
              label="Select"
              className="bg-purple-500 hover:bg-purple-600 border-purple-400"
            />
            <ToolButton
              onClick={() => setTool('pan')}
              isActive={tool === 'pan'}
              icon={Move}
              label="Pan"
              className="bg-pink-500 hover:bg-pink-600 border-pink-400"
            />
          </div>
          <div className="flex gap-2">
            <ToolButton
              onClick={() => handleZoom(1)}
              isActive={false}
              icon={ZoomIn}
              label="Zoom In"
              className="bg-green-500 hover:bg-green-600 border-green-400"
            />
            <ToolButton
              onClick={() => handleZoom(-1)}
              isActive={false}
              icon={ZoomOut}
              label="Zoom Out"
              className="bg-yellow-500 hover:bg-yellow-600 border-yellow-400"
            />
          </div>
        </div>
        <div className="bg-white bg-opacity-80 backdrop-blur-lg p-4 rounded-lg shadow-lg flex-grow relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE * pixelSize + panOffset.x * 2}
            height={CANVAS_SIZE * pixelSize + panOffset.y * 2}
            className="cursor-crosshair w-full h-full"
            onClick={handlePixelClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
      </motion.div>

      <motion.div 
        className="w-full lg:w-80 space-y-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Tabs Implementation using DaisyUI */}
        <div className="tabs">
          <a className={`tab tab-lifted ${activeTab === 'color' ? 'tab-active' : ''}`} onClick={() => setActiveTab('color')}>Color</a>
          <a className={`tab tab-lifted ${activeTab === 'image' ? 'tab-active' : ''}`} onClick={() => setActiveTab('image')}>Image</a>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-lg">
          {activeTab === 'color' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-blue-600">Color Picker</h2>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-12 h-12 p-1 bg-transparent rounded-full overflow-hidden"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="input input-bordered flex-grow bg-gray-100 text-gray-800 border-gray-300"
                />
              </div>
              <div>
                <label className="label">Hue</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  defaultValue="0"
                  className="range range-primary"
                  onChange={(e) => {
                    const hsl = `hsl(${e.target.value}, 100%, 50%)`
                    setSelectedColor(hsl)
                  }}
                />
              </div>
            </div>
          )}
          {activeTab === 'image' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-purple-600">Upload Image</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input file-input-bordered w-full bg-gray-100 text-gray-800 border-gray-300"
              />
              <p className="text-sm text-gray-600 mt-2">
                Upload an image to paint multiple pixels at once.
              </p>
            </div>
          )}
        </div>

        {/* Selected Pixels Section */}
        <AnimatePresence>
          {selectedPixels.length > 0 && (
            <motion.div 
              className="bg-white bg-opacity-80 backdrop-blur-lg p-4 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-pink-600">Selected Pixels</h2>
              <p className="text-gray-700">{selectedPixels.length} pixel(s) selected</p>
              <button 
                className="btn btn-primary w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white" 
                onClick={handlePurchasePixels}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Purchase Selected Pixels
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How It Works Button */}
        <button
          className="btn btn-outline w-full bg-white hover:bg-gray-100 text-blue-600 border-blue-300"
          onClick={() => setIsModalOpen(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          How It Works
        </button>

        {/* Dialog Implementation */}
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
              <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title className="text-lg font-medium leading-6 text-blue-600">
                      How It Works
                    </Dialog.Title>
                    <Dialog.Description className="mt-2">
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Select a color or upload an image.</li>
                        <li>Click on the canvas to paint pixels.</li>
                        <li>Use the select tool to choose multiple pixels.</li>
                        <li>Purchase pixels to own them on the blockchain.</li>
                        <li>Collaborate with others to create amazing art!</li>
                      </ol>
                    </Dialog.Description>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsModalOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </motion.div>
    </div>
  );
}