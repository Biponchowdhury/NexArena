// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NexArena} from "../NexArena.sol";

contract NexArenaHandler is Test {
    NexArena public arena;
    uint256 public constant ACTORS = 40;
    mapping(address => uint256) public ghostHigh;
    mapping(address => uint256) public ghostGames;
    mapping(address => bool) public seen;
    address[] public seenList;

    constructor(NexArena a) {
        arena = a;
    }

    function actor(uint256 i) public pure returns (address) {
        return address(uint160(0x20000 + (i % 40)));
    }

    function seenCount() external view returns (uint256) {
        return seenList.length;
    }

    function submit(uint256 actorSeed, uint256 score) external {
        address a = actor(actorSeed);
        // bias toward small range so ties and collisions are frequent
        score = (score % 4 == 0) ? bound(score, 1, 50) : bound(score, 1, 100_000_000);
        vm.prank(a);
        arena.submitScore(score);
        if (!seen[a]) {
            seen[a] = true;
            seenList.push(a);
        }
        if (score > ghostHigh[a]) ghostHigh[a] = score;
        ghostGames[a]++;
    }
}

contract NexArenaInvariantTest is Test {
    NexArena internal arena;
    NexArenaHandler internal handler;

    function setUp() public {
        arena = new NexArena();
        handler = new NexArenaHandler(arena);
        targetContract(address(handler));
    }

    // PROPERTY: board sorted descending, unique players, length <= 25, scores match highScore.
    function invariant_LeaderboardSortedUniqueBounded() public view {
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 1000);
        assertEq(e.length, total);
        assertLe(total, arena.TOP_N());
        for (uint256 i = 0; i < e.length; i++) {
            assertGt(e[i].score, 0);
            assertEq(uint256(e[i].score), handler.ghostHigh(e[i].player), "board score != ghost high");
            if (i > 0) assertGe(e[i - 1].score, e[i].score, "not sorted");
            for (uint256 j = 0; j < i; j++) {
                assertTrue(e[j].player != e[i].player, "duplicate");
            }
        }
    }

    // PROPERTY: board holds exactly min(25, players) entries, and every off-board player
    // scores no higher than the lowest on-board entry.
    function invariant_BoardContainsTopPlayers() public view {
        uint256 n = handler.seenCount();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 1000);
        assertEq(total, n > 25 ? 25 : n);
        if (total == 0) return;
        uint256 lowest = e[total - 1].score;
        for (uint256 i = 0; i < n; i++) {
            address p = handler.seenList(i);
            uint256 rank = arena.getLeaderboardRank(p);
            if (rank == 0) assertLe(handler.ghostHigh(p), lowest, "better player missing");
            else assertEq(uint256(e[rank - 1].score), handler.ghostHigh(p));
        }
    }

    // PROPERTY: per-player stats match ghost model; registry has no duplicates.
    function invariant_StatsMatchGhostAndPlayersUnique() public view {
        uint256 n = handler.seenCount();
        assertEq(arena.playerCount(), n);
        address[] memory ps = arena.getPlayers(0, 1000);
        assertEq(ps.length, n);
        for (uint256 i = 0; i < n; i++) {
            address p = handler.seenList(i);
            assertEq(ps[i], p, "registration order");
            NexArena.PlayerStats memory s = arena.getPlayerStats(p);
            assertEq(uint256(s.highScore), handler.ghostHigh(p));
            assertEq(uint256(s.gamesPlayed), handler.ghostGames(p));
            assertGe(s.highScore, s.latestScore);
        }
    }
}
