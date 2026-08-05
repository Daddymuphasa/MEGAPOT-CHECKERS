"use client";

import { Web3Provider } from "@/components/online/Web3Provider";
import { WalletButton } from "@/components/online/WalletButton";

export function ConnectWallet() {
  return (
    <Web3Provider>
      <WalletButton />
    </Web3Provider>
  );
}
