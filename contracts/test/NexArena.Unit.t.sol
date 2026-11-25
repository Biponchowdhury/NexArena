// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NexArenaTestBase} from "./NexArena.Base.t.sol";
import {Vm} from "forge-std/Vm.sol";
import {NexArena} from "../NexArena.sol";

contract NexArenaUnitTest is NexArenaTestBase {
    // ---- constants / init ----
    function test_InitialState() public view {
        assertEq(arena.MAX_SCORE(), MAX);
        assertEq(arena.TOP_N(), TOP);
        assertEq(arena.playerCount(), 0);
        (NexArena.LeaderboardEntry[] memory e, uint256 total) = arena.getLeaderboard(0, 10);
        assertEq(e.length, 0);
        assertEq(total, 0);
    }

    // ---- submitScore happy path ----
    function test_SubmitScore_FirstSubmission() public {
        vm.warp(1234);
        _submit(alice, 500);
        NexArena.PlayerStats memory s = arena.getPlayerStats(alice);
        assertEq(s.highScore, 500);
        assertEq(s.latestScore, 500);
        assertEq(s.gamesPlayed, 1);
        assertEq(s.lastSubmittedAt, 1234);
        assertTrue(s.registered);
        assertEq(arena.playerCount(), 1);
        assertEq(arena.getLeaderboardRank(alice), 1);
    }

    function test_SubmitScore_MaxScoreAccepted() public {
        _submit(alice, MAX);
        assertEq(arena.getPlayerStats(alice).highScore, MAX);
    }

    function test_SubmitScore_OneAccepted() public {
        _submit(alice, 1);
        assertEq(arena.getPlayerStats(alice).highScore, 1);
        assertEq(arena.getLeaderboardRank(alice), 1);
    }

    // ---- reverts ----
    function test_RevertWhen_ZeroScore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NexArena.InvalidScore.selector, 0));
        arena.submitScore(0);
    }

    function test_RevertWhen_ScoreAboveMax() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NexArena.InvalidScore.selector, MAX + 1));
        arena.submitScore(MAX + 1);
    }

    function test_RevertWhen_ScoreUint256Max() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NexArena.InvalidScore.selector, type(uint256).max));
        arena.submitScore(type(uint256).max);
    }

    function test_RevertWhen_InvalidScore_NoStateChange() public {
        vm.prank(alice);
        vm.expectRevert();
        arena.submitScore(0);
        assertEq(arena.playerCount(), 0);
        assertFalse(arena.getPlayerStats(alice).registered);
    }

    function test_RevertWhen_TimestampOverflow() public {
        vm.warp(uint256(type(uint64).max) + 1);
        vm.prank(alice);
        vm.expectRevert(NexArena.TimestampOverflow.selector);
        arena.submitScore(10);
    }

    function test_TimestampAtUint64MaxAccepted() public {
        vm.warp(type(uint64).max);
        _submit(alice, 10);
        assertEq(arena.getPlayerStats(alice).lastSubmittedAt, type(uint64).max);
    }

    function test_RevertWhen_GetPlayerStatsZeroAddress() public {
        vm.expectRevert(NexArena.ZeroAddress.selector);
        arena.getPlayerStats(address(0));
    }

    function test_RevertWhen_GetLeaderboardRankZeroAddress() public {
        vm.expectRevert(NexArena.ZeroAddress.selector);
        arena.getLeaderboardRank(address(0));
    }

    // ---- events ----
    function test_Emits_PlayerRegisteredAndScoreSubmitted_FirstTime() public {
        vm.expectEmit(true, false, false, false, address(arena));
        emit NexArena.PlayerRegistered(alice);
        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(alice, 100, 100, 1, true);
        _submit(alice, 100);
    }

    function test_PlayerRegistered_OnlyOnce() public {
        vm.recordLogs();
        _submit(alice, 100);
        Vm.Log[] memory l1 = vm.getRecordedLogs();
        assertEq(l1.length, 2);
        assertEq(l1[0].topics[0], NexArena.PlayerRegistered.selector);
        assertEq(l1[1].topics[0], NexArena.ScoreSubmitted.selector);

        _submit(alice, 200);
        Vm.Log[] memory l2 = vm.getRecordedLogs();
        assertEq(l2.length, 1);
        assertEq(l2[0].topics[0], NexArena.ScoreSubmitted.selector);
        assertEq(arena.playerCount(), 1);
    }

    function test_Emits_ScoreSubmitted_EachTimeWithCorrectFields() public {
        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(alice, 100, 100, 1, true);
        _submit(alice, 100);

        // lower score: not a new high
        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(alice, 40, 100, 2, false);
        _submit(alice, 40);

        // equal score: not a new high
        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(alice, 100, 100, 3, false);
        _submit(alice, 100);

        // higher score
        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(alice, 300, 300, 4, true);
        _submit(alice, 300);
    }

    // ---- per-player stats ----
    function test_Stats_HighScoreOnlyIncreases_LatestTracks_GamesCount() public {
        _submit(alice, 100);
        _submit(alice, 50);
        NexArena.PlayerStats memory s = arena.getPlayerStats(alice);
        assertEq(s.highScore, 100);
        assertEq(s.latestScore, 50);
        assertEq(s.gamesPlayed, 2);

        _submit(alice, 100);
        s = arena.getPlayerStats(alice);
        assertEq(s.highScore, 100);
        assertEq(s.latestScore, 100);
        assertEq(s.gamesPlayed, 3);

        _submit(alice, 101);
        s = arena.getPlayerStats(alice);
        assertEq(s.highScore, 101);
        assertEq(s.latestScore, 101);
        assertEq(s.gamesPlayed, 4);
    }

    function test_Stats_LastSubmittedAtUpdatesEachTime() public {
        vm.warp(1000);
        _submit(alice, 100);
        vm.warp(2000);
        _submit(alice, 10);
        assertEq(arena.getPlayerStats(alice).lastSubmittedAt, 2000);
    }

    function test_Stats_UnknownPlayerIsZeroed() public view {
        NexArena.PlayerStats memory s = arena.getPlayerStats(bob);
        assertEq(s.highScore, 0);
        assertEq(s.latestScore, 0);
        assertEq(s.gamesPlayed, 0);
        assertEq(s.lastSubmittedAt, 0);
        assertFalse(s.registered);
    }

    function test_Stats_IndependentPerPlayer() public {
        _submit(alice, 100);
        _submit(bob, 200);
        assertEq(arena.getPlayerStats(alice).highScore, 100);
        assertEq(arena.getPlayerStats(bob).highScore, 200);
        assertEq(arena.getPlayerStats(alice).gamesPlayed, 1);
    }

    // ---- players list ----
    function test_PlayerCount_AndRegistrationOrder() public {
        _submit(alice, 1);
        _submit(bob, 2);
        _submit(alice, 3);
        _submit(carol, 4);
        assertEq(arena.playerCount(), 3);
        address[] memory ps = arena.getPlayers(0, 10);
        assertEq(ps.length, 3);
        assertEq(ps[0], alice);
        assertEq(ps[1], bob);
        assertEq(ps[2], carol);
    }

    function test_GetPlayers_Pagination() public {
        for (uint256 i = 0; i < 5; i++) _submit(_p(i), i + 1);
        address[] memory ps = arena.getPlayers(1, 2);
        assertEq(ps.length, 2);
        assertEq(ps[0], _p(1));
        assertEq(ps[1], _p(2));

        ps = arena.getPlayers(3, 100); // limit larger than remaining
        assertEq(ps.length, 2);
        assertEq(ps[0], _p(3));
        assertEq(ps[1], _p(4));
    }

    function test_GetPlayers_EdgeCases() public {
        for (uint256 i = 0; i < 3; i++) _submit(_p(i), i + 1);
        assertEq(arena.getPlayers(3, 10).length, 0); // offset == length
        assertEq(arena.getPlayers(100, 10).length, 0); // offset beyond
        assertEq(arena.getPlayers(type(uint256).max, 10).length, 0);
        assertEq(arena.getPlayers(0, 0).length, 0); // limit 0
        assertEq(arena.getPlayers(1, 0).length, 0);
        assertEq(arena.getPlayers(0, type(uint256).max).length, 3);
    }

    function test_GetPlayers_Empty() public view {
        assertEq(arena.getPlayers(0, 10).length, 0);
    }

    // ---- rank ----
    function test_Rank_UnknownPlayerIsZero() public {
        _submit(alice, 5);
        assertEq(arena.getLeaderboardRank(bob), 0);
    }
}
