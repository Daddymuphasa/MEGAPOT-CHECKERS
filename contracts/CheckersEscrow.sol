// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CheckersEscrow
 * @notice Player-vs-player USDC wager escrow for Megapot Checkers on Base mainnet.
 *
 * Flow:
 *   1. Host calls `createGame(stakeAmount)` — transfers USDC into escrow.
 *   2. Guest calls `joinGame(gameId)` — transfers matching USDC into escrow.
 *   3. Both players play the checkers match off-chain.
 *   4. Both call `reportWinner(gameId, winner)` — 2-of-2 agreement settles the game.
 *   5. Winner calls `claim(gameId)` — receives the full pot minus platform fee.
 *
 * Safety:
 *   - ReentrancyGuard on all state-changing functions.
 *   - If only one player has reported after `DISPUTE_TIMEOUT`, either player can
 *     call `forceRefund(gameId)` to refund both stakes.
 *   - Host can cancel an open (unjoined) game at any time via `cancelGame(gameId)`.
 *   - Platform fee (default 2%, max 5%) goes to the `treasury` address.
 *   - Host cannot join their own game.
 *   - Each player can only report once per game.
 */
contract CheckersEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ──────────────────────────────────────────────────────────
    enum Status {
        Open,      // host created, waiting for guest
        Active,    // both players joined
        Reported,  // at least one player reported a result
        Settled,   // 2-of-2 agreement reached; winner can claim
        Cancelled, // host cancelled before guest joined
        Refunded   // dispute timeout or draw — both refunded
    }

    struct Game {
        address host;
        address guest;
        uint256 stake;          // per-player stake in USDC (6 decimals)
        Status status;
        address hostReport;     // who the host says won
        address guestReport;    // who the guest says won
        bool hostReported;      // true once host has called reportWinner
        bool guestReported;     // true once guest has called reportWinner
        address winner;
        bool claimed;
        uint256 createdAt;
        uint256 reportedAt;     // timestamp of first report (for dispute timeout)
    }

    // ── Constants ──────────────────────────────────────────────────────
    uint256 public constant MAX_FEE_BPS = 500;       // 5% ceiling
    uint256 public constant DISPUTE_TIMEOUT = 24 hours;
    uint256 public constant MIN_STAKE = 100_000;      // $0.10 USDC (6 decimals)
    uint256 public constant MAX_STAKE = 1_000_000_000; // $1,000 USDC

    // ── State ──────────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    address public treasury;
    uint256 public feeBps = 200; // 2%
    uint256 public nextGameId = 1;
    mapping(uint256 => Game) public games;

    // ── Events ─────────────────────────────────────────────────────────
    event GameCreated(uint256 indexed gameId, address indexed host, uint256 stake);
    event GameJoined(uint256 indexed gameId, address indexed guest);
    event GameCancelled(uint256 indexed gameId);
    event WinnerReported(uint256 indexed gameId, address indexed by, address winner);
    event GameSettled(uint256 indexed gameId, address indexed winner, uint256 payout);
    event GameRefunded(uint256 indexed gameId);
    event PotClaimed(uint256 indexed gameId, address indexed winner, uint256 amount);

    // ── Errors ─────────────────────────────────────────────────────────
    error NotPlayer();
    error BadStatus();
    error StakeTooLow();
    error StakeTooHigh();
    error NotWinner();
    error AlreadyClaimed();
    error AlreadyReported();
    error DisputeNotExpired();
    error InvalidWinner();
    error CannotJoinOwnGame();

    // ── Constructor ────────────────────────────────────────────────────
    constructor(address _usdc, address _treasury) {
        require(_usdc != address(0), "zero usdc");
        require(_treasury != address(0), "zero treasury");
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ── Game lifecycle ─────────────────────────────────────────────────

    function createGame(uint256 stake) external nonReentrant returns (uint256 gameId) {
        if (stake < MIN_STAKE) revert StakeTooLow();
        if (stake > MAX_STAKE) revert StakeTooHigh();

        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.host = msg.sender;
        g.stake = stake;
        g.status = Status.Open;
        g.createdAt = block.timestamp;

        usdc.safeTransferFrom(msg.sender, address(this), stake);
        emit GameCreated(gameId, msg.sender, stake);
    }

    function joinGame(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert BadStatus();
        if (msg.sender == g.host) revert CannotJoinOwnGame();

        g.guest = msg.sender;
        g.status = Status.Active;

        usdc.safeTransferFrom(msg.sender, address(this), g.stake);
        emit GameJoined(gameId, msg.sender);
    }

    function cancelGame(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert BadStatus();
        if (msg.sender != g.host) revert NotPlayer();

        g.status = Status.Cancelled;
        usdc.safeTransfer(g.host, g.stake);
        emit GameCancelled(gameId);
    }

    /**
     * @notice Report the match winner. Both must agree for settlement.
     * @param winner Address of the winning player, or address(0) for a draw.
     */
    function reportWinner(uint256 gameId, address winner) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Active && g.status != Status.Reported) revert BadStatus();
        if (msg.sender != g.host && msg.sender != g.guest) revert NotPlayer();
        if (winner != g.host && winner != g.guest && winner != address(0)) revert InvalidWinner();

        bool isHost = msg.sender == g.host;

        // Prevent double-reporting
        if (isHost) {
            if (g.hostReported) revert AlreadyReported();
            g.hostReported = true;
            g.hostReport = winner;
        } else {
            if (g.guestReported) revert AlreadyReported();
            g.guestReported = true;
            g.guestReport = winner;
        }

        // Track first report timestamp for dispute timeout
        if (g.status == Status.Active) {
            g.status = Status.Reported;
            g.reportedAt = block.timestamp;
        }

        emit WinnerReported(gameId, msg.sender, winner);

        // If both have reported, check for agreement
        if (g.hostReported && g.guestReported) {
            if (g.hostReport == g.guestReport) {
                _settle(gameId, g);
            }
            // If they disagree, status stays Reported → forceRefund after timeout
        }
    }

    function forceRefund(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Reported) revert BadStatus();
        if (msg.sender != g.host && msg.sender != g.guest) revert NotPlayer();
        if (block.timestamp < g.reportedAt + DISPUTE_TIMEOUT) revert DisputeNotExpired();

        g.status = Status.Refunded;
        usdc.safeTransfer(g.host, g.stake);
        usdc.safeTransfer(g.guest, g.stake);
        emit GameRefunded(gameId);
    }

    function claim(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        if (g.status != Status.Settled) revert BadStatus();
        if (g.claimed) revert AlreadyClaimed();
        if (msg.sender != g.winner) revert NotWinner();

        g.claimed = true;
        uint256 pot = g.stake * 2;
        uint256 fee = (pot * feeBps) / 10_000;
        uint256 payout = pot - fee;

        if (fee > 0) {
            usdc.safeTransfer(treasury, fee);
        }
        usdc.safeTransfer(g.winner, payout);
        emit PotClaimed(gameId, g.winner, payout);
    }

    // ── Views ──────────────────────────────────────────────────────────

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    // ── Internal ───────────────────────────────────────────────────────

    function _settle(uint256 gameId, Game storage g) private {
        address agreed = g.hostReport; // == g.guestReport at this point

        if (agreed == address(0)) {
            // Draw — refund both players
            g.status = Status.Refunded;
            usdc.safeTransfer(g.host, g.stake);
            usdc.safeTransfer(g.guest, g.stake);
            emit GameRefunded(gameId);
        } else {
            g.winner = agreed;
            g.status = Status.Settled;
            emit GameSettled(gameId, agreed, g.stake * 2);
        }
    }

    // ── Admin (treasury-only) ─────────────────────────────────────────

    function setFee(uint256 newFeeBps) external {
        require(msg.sender == treasury, "not treasury");
        require(newFeeBps <= MAX_FEE_BPS, "fee too high");
        feeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external {
        require(msg.sender == treasury, "not treasury");
        require(newTreasury != address(0), "zero address");
        treasury = newTreasury;
    }
}
