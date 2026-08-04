"use client";

import { Wallet, LogOut, AlertTriangle } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injectedConnector = connectors[0];
    return (
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending || !injectedConnector}
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      >
        <Wallet className="h-4 w-4" />
        {isPending ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  if (chainId !== baseSepolia.id) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => switchChain({ chainId: baseSepolia.id })}
      >
        <AlertTriangle className="h-4 w-4" />
        Switch to Base Sepolia
      </Button>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => disconnect()}>
      <span className="h-2 w-2 rounded-full bg-good" />
      {shortAddress(address)}
      <LogOut className="h-3.5 w-3.5 opacity-60" />
    </Button>
  );
}
