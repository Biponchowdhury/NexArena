// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NexArenaTestBase} from "./NexArena.Base.t.sol";
import {NexArena} from "../NexArena.sol";

contract NexArenaLeaderboardTest is NexArenaTestBase {
    function test_Leaderboard_DescendingOrder() public {
        _submit(alice, 100);
        _submit(bob, 300);
        _submit(carol, 200);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e.length, 3);
        assertEq(e[0].player, bob);
        assertEq(e[0].score, 300);
        assertEq(e[1].player, carol);
        assertEq(e[1].score, 200);
        assertEq(e[2].player, alice);
        assertEq(e[2].score, 100);
        assertEq(arena.getLeaderboardRank(bob), 1);
        assertEq(arena.getLeaderboardRank(carol), 2);
        assertEq(arena.getLeaderboardRank(alice), 3);
    }

    function test_Leaderboard_TiesPreserveAchievementOrder() public {
        _submit(alice, 100);
        _submit(bob, 100);
        _submit(carol, 100);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e[0].player, alice);
        assertEq(e[1].player, bob);
        assertEq(e[2].player, carol);
    }

    function test_Leaderboard_TieInsertedAfterEarlierEqualButBeforeLower() public {
        _submit(alice, 200);
        _submit(bob, 100);
        _submit(carol, 200);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e[0].player, alice);
        assertEq(e[1].player, carol);
        assertEq(e[2].player, bob);
    }

    function test_Leaderboard_ImprovementRemovesAndReinserts() public {
        _submit(alice, 100);
        _submit(bob, 200);
        _submit(carol, 300);
        // alice (rank 3) improves to top
        _submit(alice, 400);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e.length, 3, "no duplicate entry");
        assertEq(e[0].player, alice);
        assertEq(e[0].score, 400);
        assertEq(e[1].player, carol);
        assertEq(e[2].player, bob);
        assertEq(arena.getLeaderboardRank(alice), 1);
    }

    function test_Leaderboard_ImprovementMovesPartially() public {
        _submit(alice, 100);
        _submit(bob, 200);
        _submit(carol, 300);
        _submit(alice, 250);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e[0].player, carol);
        assertEq(e[1].player, alice);
        assertEq(e[1].score, 250);
        assertEq(e[2].player, bob);
    }

    function test_Leaderboard_ImprovementTieWithOthersGoesAfterThem() public {
        _submit(alice, 100);
        _submit(bob, 200);
        _submit(alice, 200); // ties bob, achieved later => below bob
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e.length, 2);
        assertEq(e[0].player, bob);
        assertEq(e[1].player, alice);
    }

    function test_Leaderboard_TopPlayerImprovesStaysFirstNoDup() public {
        _submit(alice, 100);
        _submit(bob, 50);
        _submit(alice, 150);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e.length, 2);
        assertEq(e[0].player, alice);
        assertEq(e[0].score, 150);
        assertEq(e[1].player, bob);
    }

    function test_Leaderboard_LowerOrEqualScoreDoesNotChangeBoard() public {
        _submit(alice, 100);
        _submit(bob, 50);
        _submit(alice, 100); // equal, no strict improvement
        _submit(alice, 10);
        NexArena.LeaderboardEntry[] memory e = _board();
        assertEq(e.length, 2);
        assertEq(e[0].player, alice);
        assertEq(e[0].score, 100);
        assertEq(arena.getPlayerStats(alice).gamesPlayed, 3);
    }

    function _fillBoard() internal {
        // players 0..24 with scores 100,200,...,2500 (player 24 is top)
        for (uint256 i = 0; i < TOP; i++) _submit(_p(i), (i + 1) * 100);
    }

    function test_Leaderboard_CapsAtTopN() public {
        _fillBoard();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 100);
        assertEq(total, TOP);
        assertEq(e.length, TOP);
        assertEq(e[0].player, _p(24));
        assertEq(e[TOP - 1].player, _p(0));
        _assertBoardInvariant();
    }

    function test_Leaderboard_EvictsLowestWhenBetterScoreArrives() public {
        _fillBoard();
        address newbie = makeAddr("newbie");
        _submit(newbie, 150); // beats p0 (100), below p1 (200)
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 100);
        assertEq(total, TOP);
        assertEq(e[TOP - 1].player, newbie);
        assertEq(e[TOP - 1].score, 150);
        assertEq(arena.getLeaderboardRank(_p(0)), 0, "evicted");
        assertEq(arena.getLeaderboardRank(newbie), TOP);
        // evicted player still has stats
        assertEq(arena.getPlayerStats(_p(0)).highScore, 100);
        _assertBoardInvariant();
    }

    function test_Leaderboard_EvictionInsertAtTop() public {
        _fillBoard();
        address newbie = makeAddr("newbie");
        _submit(newbie, MAX);
        assertEq(arena.getLeaderboardRank(newbie), 1);
        assertEq(arena.getLeaderboardRank(_p(0)), 0);
        assertEq(arena.getLeaderboardRank(_p(1)), TOP);
        _assertBoardInvariant();
    }

    function test_Leaderboard_ScoreEqualToLastWhenFullDoesNotEnter() public {
        _fillBoard();
        address newbie = makeAddr("newbie");
        _submit(newbie, 100); // equal to lowest (p0): earlier achiever keeps spot
        assertEq(arena.getLeaderboardRank(newbie), 0);
        assertEq(arena.getLeaderboardRank(_p(0)), TOP);
        assertTrue(arena.getPlayerStats(newbie).registered);
    }

    function test_Leaderboard_ScoreBelowLastWhenFullDoesNotEnter() public {
        _fillBoard();
        address newbie = makeAddr("newbie");
        _submit(newbie, 50);
        assertEq(arena.getLeaderboardRank(newbie), 0);
        (, uint256 total) = arena.getLeaderboard(0, 1);
        assertEq(total, TOP);
    }

    function test_Leaderboard_FullBoardMemberImproves_NoEvictionNoDup() public {
        _fillBoard();
        _submit(_p(0), 10_000); // lowest improves to top
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 100);
        assertEq(total, TOP);
        assertEq(e[0].player, _p(0));
        assertEq(e[0].score, 10_000);
        for (uint256 i = 1; i < TOP; i++) {
            assertTrue(arena.getLeaderboardRank(_p(i)) != 0, "nobody evicted");
        }
        _assertBoardInvariant();
    }

    function test_Leaderboard_FullBoardMemberImprovesToLastSlotTie() public {
        _fillBoard();
        // p1 (200) improves to 201: still lowest-but-one -> still on board, p0 remains last
        _submit(_p(1), 201);
        assertEq(arena.getLeaderboardRank(_p(1)), TOP - 1);
        assertEq(arena.getLeaderboardRank(_p(0)), TOP);
        _assertBoardInvariant();
    }

    function test_Leaderboard_EvictedPlayerCanReenterWithImprovement() public {
        _fillBoard();
        address newbie = makeAddr("newbie");
        _submit(newbie, 150); // evicts p0
        assertEq(arena.getLeaderboardRank(_p(0)), 0);
        _submit(_p(0), 100); // not an improvement, remains out
        assertEq(arena.getLeaderboardRank(_p(0)), 0);
        _submit(_p(0), 99_999); // improvement => re-enters at top, evicting lowest
        assertEq(arena.getLeaderboardRank(_p(0)), 1);
        assertEq(arena.getLeaderboardRank(newbie), 0, "newbie now evicted");
        _assertBoardInvariant();
    }

    // ---- pagination ----
    function _seed5() internal {
        for (uint256 i = 0; i < 5; i++) _submit(_p(i), (i + 1) * 10); // board: p4,p3,p2,p1,p0
    }

    function test_Pagination_Page() public {
        _seed5();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(1, 2);
        assertEq(total, 5);
        assertEq(e.length, 2);
        assertEq(e[0].player, _p(3));
        assertEq(e[1].player, _p(2));
    }

    function test_Pagination_OffsetBeyondLength() public {
        _seed5();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(10, 5);
        assertEq(e.length, 0);
        assertEq(total, 5);
        (e, total) = arena.getLeaderboard(5, 5); // offset == length
        assertEq(e.length, 0);
        assertEq(total, 5);
        (e, total) = arena.getLeaderboard(type(uint256).max, type(uint256).max);
        assertEq(e.length, 0);
        assertEq(total, 5);
    }

    function test_Pagination_LimitZero() public {
        _seed5();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 0);
        assertEq(e.length, 0);
        assertEq(total, 5);
        (e, total) = arena.getLeaderboard(2, 0);
        assertEq(e.length, 0);
        assertEq(total, 5);
    }

    function test_Pagination_LimitLargerThanLength() public {
        _seed5();
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 1000);
        assertEq(e.length, 5);
        assertEq(total, 5);
        (e, total) = arena.getLeaderboard(3, type(uint256).max);
        assertEq(e.length, 2);
        assertEq(e[0].player, _p(1));
        assertEq(e[1].player, _p(0));
    }

    function test_Pagination_EmptyBoard() public view {
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 10);
        assertEq(e.length, 0);
        assertEq(total, 0);
    }
}
