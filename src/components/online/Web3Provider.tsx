"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { incoConfig } from "@/lib/inco/config";
import { megapotConfig } from "@/lib/megapot/config";

// Base Sepolia hosts the Inco wager contract; Base mainnet hosts the Megapot
// jackpot. One shared config so wallet state survives across both flows.
export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(incoConfig.rpcUrl),
    [base.id]: http(megapotConfig.rpcUrl),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
