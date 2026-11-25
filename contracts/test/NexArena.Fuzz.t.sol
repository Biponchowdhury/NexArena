// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NexArenaTestBase} from "./NexArena.Base.t.sol";
import {NexArena} from "../NexArena.sol";

contract NexArenaFuzzTest is NexArenaTestBase {
    function testFuzz_SubmitScore_ValidRange(address who, uint256 score, uint64 ts) public {
        vm.assume(who != address(0));
        score = bound(score, 1, MAX);
        vm.warp(ts);

        vm.expectEmit(true, false, false, true, address(arena));
        emit NexArena.ScoreSubmitted(who, score, score, 1, true);
        _submit(who, score);

        NexArena.PlayerStats memory s = arena.getPlayerStats(who);
        assertEq(s.highScore, score);
        assertEq(s.latestScore, score);
        assertEq(s.gamesPlayed, 1);
        assertEq(s.lastSubmittedAt, ts);
        assertTrue(s.registered);
        assertEq(arena.getLeaderboardRank(who), 1);
    }

    function testFuzz_SubmitScore_InvalidReverts(uint256 score) public {
        if (score != 0) score = bound(score, MAX + 1, type(uint256).max);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NexArena.InvalidScore.selector, score));
        arena.submitScore(score);
    }

    function testFuzz_Sequence_SinglePlayerStats(uint256[] memory scores) public {
        vm.assume(scores.length > 0 && scores.length <= 40);
        uint256 high;
        for (uint256 i = 0; i < scores.length; i++) {
            uint256 sc = bound(scores[i], 1, MAX);
            uint256 prevHigh = high;
            if (sc > high) high = sc;

            vm.expectEmit(true, false, false, true, address(arena));
            emit NexArena.ScoreSubmitted(alice, sc, high, i + 1, sc > prevHigh);
            _submit(alice, sc);

            NexArena.PlayerStats memory s = arena.getPlayerStats(alice);
            assertEq(s.highScore, high);
            assertEq(s.latestScore, sc);
            assertEq(s.gamesPlayed, i + 1);
            assertGe(s.highScore, prevHigh, "highScore decreased");
        }
        assertEq(arena.playerCount(), 1);
        assertEq(_board().length, 1);
        assertEq(_board()[0].score, high);
    }

    function testFuzz_Sequence_ManyPlayersBoardValid(uint8[] memory who, uint256[] memory scores) public {
        uint256 n = who.length < scores.length ? who.length : scores.length;
        if (n > 120) n = 120;
        for (uint256 i = 0; i < n; i++) {
            _submit(_p(who[i] % 40), bound(scores[i], 1, MAX));
        }
        _assertBoardInvariant();
    }

    function testFuzz_GetLeaderboard_Pagination(uint8 count, uint256 offset, uint256 limit) public {
        count = uint8(bound(count, 0, 30));
        for (uint256 i = 0; i < count; i++) _submit(_p(i), i + 1);
        uint256 expectedTotal = count > TOP ? TOP : count;
        (NexArena.LeaderboardEntry[] memory page, uint256 total) = arena.getLeaderboard(offset, limit);
        assertEq(total, expectedTotal);
        NexArena.LeaderboardEntry[] memory all = _board();
        uint256 expectedLen = offset >= total ? 0 : total - offset;
        if (limit < expectedLen) expectedLen = limit;
        assertEq(page.length, expectedLen);
        for (uint256 i = 0; i < page.length; i++) {
            assertEq(page[i].player, all[offset + i].player);
            assertEq(page[i].score, all[offset + i].score);
        }
    }

    function testFuzz_GetPlayers_Pagination(uint8 count, uint256 offset, uint256 limit) public {
        count = uint8(bound(count, 0, 30));
        for (uint256 i = 0; i < count; i++) _submit(_p(i), i + 1);
        address[] memory page = arena.getPlayers(offset, limit);
        uint256 expectedLen = offset >= count ? 0 : count - offset;
        if (limit < expectedLen) expectedLen = limit;
        assertEq(page.length, expectedLen);
        for (uint256 i = 0; i < page.length; i++) {
            assertEq(page[i], _p(offset + i));
        }
    }
}
