import React, { useMemo } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface CanvasProps {
  onPixelClick: (pixelId: number) => void;
  setPixels: React.Dispatch<React.SetStateAction<{ [key: number]: { color: number; owner: string } }>>;
  pixels: { [key: number]: { color: number; owner: string } };
}

const CANVAS_SIZE = 64; // Ensure consistency with page.tsx

export const Canvas: React.FC<CanvasProps> = ({ onPixelClick, setPixels, pixels }) => {
  const { data: canvasWidth } = useScaffoldReadContract({
    contractName: "CollaborativeArtCanvas",
    functionName: "CANVAS_WIDTH",
  });

  const { data: canvasHeight } = useScaffoldReadContract({
    contractName: "CollaborativeArtCanvas",
    functionName: "CANVAS_HEIGHT",
  });

  const totalPixels = useMemo(() => {
    if (canvasWidth && canvasHeight) {
      return Number(canvasWidth) * Number(canvasHeight);
    }
    return 0;
  }, [canvasWidth, canvasHeight]);

  const pixelElements = useMemo(() => {
    const elements = [];
    for (let i = 0; i < totalPixels; i++) {
      const pixel = pixels[i];
      const color = pixel ? `#${pixel.color.toString(16).padStart(6, "0")}` : "#FFFFFF";
      elements.push(
        <div
          key={i}
          style={{
            width: "20px",
            height: "20px",
            backgroundColor: color,
            cursor: "pointer",
          }}
          onClick={() => onPixelClick(i)}
        />,
      );
    }
    return elements;
  }, [totalPixels, pixels, onPixelClick]);

  // Conditional Rendering: Show loading state if contract is still initializing
  if (!canvasWidth || !canvasHeight || totalPixels === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${canvasWidth}, 20px)`,
        gap: "1px",
        border: "1px solid #ccc",
      }}
    >
      {pixelElements}
    </div>
  );
};
