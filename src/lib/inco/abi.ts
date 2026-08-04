/** Minimal ABI for the ConfidentialCheckers contract (see contracts/). */
export const confidentialCheckersAbi = [
  {
    type: "function",
    name: "openGame",
    stateMutability: "payable",
    inputs: [
      { name: "encStake", type: "bytes" },
      { name: "encSeed", type: "bytes" },
    ],
    outputs: [{ name: "gameId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinGame",
    stateMutability: "payable",
    inputs: [
      { name: "gameId", type: "uint256" },
      { name: "encStake", type: "bytes" },
      { name: "encSeed", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reportResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "gameId", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "revealStakes",
    stateMutability: "nonpayable",
    inputs: [{ name: "gameId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "GameOpened",
    inputs: [
      { name: "gameId", type: "uint256", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "buyInWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GameSettled",
    inputs: [
      { name: "gameId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "pot", type: "uint256", indexed: false },
    ],
  },
] as const;
