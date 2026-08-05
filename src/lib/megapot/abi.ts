import { parseAbi } from "viem";

/** Minimal Megapot Jackpot ABI (full ABI: https://llms.megapot.io/abi/Jackpot.json). */
export const JACKPOT_ABI = parseAbi([
  "function currentDrawingId() view returns (uint256)",
  "function getDrawingState(uint256 _drawingId) view returns ((uint256 prizePool, uint256 ticketPrice, uint256 edgePerTicket, uint256 referralWinShare, uint256 referralFee, uint256 globalTicketsBought, uint256 lpEarnings, uint256 drawingTime, uint256 winningTicket, uint8 ballMax, uint8 bonusballMax, address payoutCalculator, bool jackpotLock))",
  "function buyTickets((uint8[] normals, uint8 bonusball)[] _tickets, address _recipient, address[] _referrers, uint256[] _referralSplit, bytes32 _source) returns (uint256[] ticketIds)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export const ESCROW_ABI = parseAbi([
  "function createGame(uint256 stake) returns (uint256 gameId)",
  "function joinGame(uint256 gameId)",
  "function cancelGame(uint256 gameId)",
  "function reportWinner(uint256 gameId, address winner)",
  "function forceRefund(uint256 gameId)",
  "function claim(uint256 gameId)",
  "function getGame(uint256 gameId) view returns ((address host, address guest, uint256 stake, uint8 status, address hostReport, address guestReport, bool hostReported, bool guestReported, address winner, bool claimed, uint256 createdAt, uint256 reportedAt))",
  "function nextGameId() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, address indexed host, uint256 stake)",
  "event GameJoined(uint256 indexed gameId, address indexed guest)",
  "event GameSettled(uint256 indexed gameId, address indexed winner, uint256 payout)",
  "event PotClaimed(uint256 indexed gameId, address indexed winner, uint256 amount)",
  "event GameRefunded(uint256 indexed gameId)",
]);
