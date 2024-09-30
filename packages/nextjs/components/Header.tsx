"use client";

import React, { useCallback, useRef, useState } from "react";
import { Fragment, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Address } from "viem";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { Bars3Icon, BugAntIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";
import { truncateAddress } from "~~/utils/scaffold-eth";

// Remove the menuLinks array and HeaderMenuLinks component

export const Header = () => {
  const { address } = useAccount();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  const { data: paintTokenBalance } = useScaffoldReadContract<"PaintToken", "balanceOf">({
    contractName: "PaintToken",
    functionName: "balanceOf",
    args: [address as Address],
  });

  const { data: paintTokenTotalSupply } = useScaffoldReadContract<"PaintToken", "totalSupply">({
    contractName: "PaintToken",
    functionName: "totalSupply",
  });

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "visible";
    }
  }, [isDrawerOpen]);

  const targetNetwork = getTargetNetworks();

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="sticky lg:static top-0 navbar bg-gradient-to-r from-blue-900 to-blue-800 text-white min-h-0 flex-shrink-0 justify-between z-20 shadow-lg px-4 sm:px-8">
      <div className="navbar-start w-auto lg:w-1/2">
        <Link href="/" passHref className="flex items-center gap-2 ml-4 mr-6">
          <div className="flex flex-col">
            <span className="font-bold text-2xl">Collaborative Art Canvas</span>
            <span className="text-sm">Create Together</span>
          </div>
        </Link>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-2 shadow-md">
            <div className="font-bold text-yellow-300">
              {formatLargeNumber(Number(paintTokenBalance) / 10 ** 18)} 🎨
            </div>
            <div className="text-xs">
              Your Paint Tokens
            </div>
          </div>
          <div className="bg-blue-700 bg-opacity-50 rounded-lg p-2 shadow-md">
            <div className="font-bold text-green-300">
              {(Number(paintTokenTotalSupply) / 10 ** 18).toFixed(0)} 🖌️
            </div>
            <div className="text-xs">
              Total Unburned Tokens
            </div>
          </div>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    </div>
  );
};