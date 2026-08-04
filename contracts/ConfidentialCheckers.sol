// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint256, ebool, e} from "@inco/lightning/src/Lib.sol";

/**
 * @title ConfidentialCheckers
 * @notice Trustless escrow + confidential wager for Megapot Checkers, built on
 *         Inco Lightning confidential compute (Base Sepolia).
 *
 * The novel, only-possible-with-FHE mechanic:
 *   • Each player commits a *blind stake* — an encrypted euint256 — alongside a
 *     public buy-in. The stake amount is hidden from the opponent for the whole
 *     game (impossible on a transparent chain) yet provably fixed up front.
 *   • Each player also commits an encrypted `powerSeed`. The seed deterministic-
 *     ally assigns hidden power-ups to their pieces client-side; because the
 *     seed is encrypted on-chain, the opponent cannot see or grind the layout.
 *   • At the end both players report the winner (2-of-2 agreement). The winner
 *     withdraws the pot trustlessly. Only then are the blind stakes revealed via
 *     Inco attested decryption, settling any side-bet transparently.
 */
contract ConfidentialCheckers {
    enum Status {
        Open,      // waiting for a guest
        Active,    // both joined, game in progress
        Reported,  // one player reported a result
        Settled    // winner agreed; pot claimable
    }

    struct Game {
        address host;
        address guest;
        uint256 buyInWei;      // per-player public buy-in
        uint256 pot;           // total escrow (2 * buyIn)
        euint256 hostStake;    // blind confidential stake (host)
        euint256 guestStake;   // blind confidential stake (guest)
        euint256 hostSeed;     // encrypted power seed (host)
        euint256 guestSeed;    // encrypted power seed (guest)
        Status status;
        address hostReportedWinner;
        address guestReportedWinner;
        address winner;
        bool claimed;
        bool stakesRevealed; // stakes marked publicly decryptable
    }

    uint256 public nextGameId = 1;
    mapping(uint256 => Game) public games;

    event GameOpened(uint256 indexed gameId, address indexed host, uint256 buyInWei);
    event GameJoined(uint256 indexed gameId, address indexed guest);
    event ResultReported(uint256 indexed gameId, address indexed by, address winner);
    event GameSettled(uint256 indexed gameId, address indexed winner, uint256 pot);
    event PotClaimed(uint256 indexed gameId, address indexed winner, uint256 amount);
    event StakesRevealed(uint256 indexed gameId, uint256 hostStake, uint256 guestStake);

    error NotPlayer();
    error BadState();
    error WrongBuyIn();
    error AlreadyClaimed();
    error NotWinner();
    error NoAgreement();

    /**
     * @notice Open a game: escrow the public buy-in and commit an encrypted
     *         blind stake + power seed.
     * @param encStake ciphertext handle produced by @inco/js `encrypt(...)`
     * @param encSeed  ciphertext handle for the client-side power assignment
     */
    function openGame(bytes calldata encStake, bytes calldata encSeed)
        external
        payable
        returns (uint256 gameId)
    {
        require(msg.value > 0, WrongBuyIn());
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.host = msg.sender;
        g.buyInWei = msg.value;
        g.pot = msg.value;
        g.hostStake = e.newEuint256(encStake, msg.sender);
        g.hostSeed = e.newEuint256(encSeed, msg.sender);
        g.status = Status.Open;

        // Allow the contract (and owner) to operate on these handles later.
        e.allowThis(g.hostStake);
        e.allow(g.hostStake, msg.sender);
        e.allowThis(g.hostSeed);
        e.allow(g.hostSeed, msg.sender);

        emit GameOpened(gameId, msg.sender, msg.value);
    }

    /**
     * @notice Join an open game with a matching buy-in and blind commitments.
     */
    function joinGame(uint256 gameId, bytes calldata encStake, bytes calldata encSeed)
        external
        payable
    {
        Game storage g = games[gameId];
        require(g.status == Status.Open, BadState());
        require(msg.value == g.buyInWei, WrongBuyIn());

        g.guest = msg.sender;
        g.pot += msg.value;
        g.guestStake = e.newEuint256(encStake, msg.sender);
        g.guestSeed = e.newEuint256(encSeed, msg.sender);
        g.status = Status.Active;

        e.allowThis(g.guestStake);
        e.allow(g.guestStake, msg.sender);
        e.allowThis(g.guestSeed);
        e.allow(g.guestSeed, msg.sender);

        emit GameJoined(gameId, msg.sender);
    }

    /**
     * @notice Report the game winner. When both players agree, the game settles
     *         and the pot becomes claimable by the winner. This is a simple
     *         2-of-2 oracle; a production build could add a signed-move referee.
     */
    function reportResult(uint256 gameId, address winner) external {
        Game storage g = games[gameId];
        require(g.status == Status.Active || g.status == Status.Reported, BadState());
        require(msg.sender == g.host || msg.sender == g.guest, NotPlayer());
        require(winner == g.host || winner == g.guest || winner == address(0), BadState());

        if (msg.sender == g.host) g.hostReportedWinner = winner;
        else g.guestReportedWinner = winner;
        g.status = Status.Reported;

        emit ResultReported(gameId, msg.sender, winner);

        bool bothReported =
            (g.hostReportedWinner != address(0) || g.guestReportedWinner != address(0)) &&
            _reported(g, g.host) && _reported(g, g.guest);

        if (bothReported && g.hostReportedWinner == g.guestReportedWinner) {
            g.winner = g.hostReportedWinner;
            g.status = Status.Settled;
            emit GameSettled(gameId, g.winner, g.pot);
        }
    }

    function _reported(Game storage g, address who) private view returns (bool) {
        // A player is considered to have reported once either field is set for
        // them; address(0) is the sentinel for "no report yet".
        if (who == g.host) return g.hostReportedWinner != address(0) || g.guestReportedWinner != address(0);
        return g.guestReportedWinner != address(0) || g.hostReportedWinner != address(0);
    }

    /**
     * @notice Winner withdraws the full pot after the game has settled.
     */
    function claim(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.Settled, NoAgreement());
        require(!g.claimed, AlreadyClaimed());
        require(msg.sender == g.winner, NotWinner());

        g.claimed = true;
        uint256 amount = g.pot;
        (bool ok, ) = payable(g.winner).call{value: amount}("");
        require(ok, "transfer failed");
        emit PotClaimed(gameId, g.winner, amount);
    }

    /**
     * @notice After settlement, mark both blind stakes as publicly decryptable.
     *         Either player may call this. The cleartext values are then fetched
     *         off-chain by anyone via `@inco/js` `attestedReveal([handle])`,
     *         which returns the plaintext together with covalidator signatures —
     *         making the side-bet transparent and verifiable once the game ends.
     */
    function revealStakes(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.Settled, BadState());
        require(msg.sender == g.host || msg.sender == g.guest, NotPlayer());
        require(!g.stakesRevealed, BadState());

        e.reveal(g.hostStake);
        e.reveal(g.guestStake);
        g.stakesRevealed = true;

        // The handles below can now be decrypted off-chain via attestedReveal.
        emit StakesRevealed(
            gameId,
            uint256(euint256.unwrap(g.hostStake)),
            uint256(euint256.unwrap(g.guestStake))
        );
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
}
