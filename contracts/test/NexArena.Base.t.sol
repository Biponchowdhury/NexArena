// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NexArena} from "../NexArena.sol";

abstract contract NexArenaTestBase is Test {
    NexArena internal arena;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint256 internal constant MAX = 100_000_000;
    uint256 internal constant TOP = 25;

    function setUp() public virtual {
        vm.warp(1_700_000_000);
        arena = new NexArena();
    }

    function _submit(address who, uint256 score) internal {
        vm.prank(who);
        arena.submitScore(score);
    }

    function _p(uint256 i) internal pure returns (address) {
        return address(uint160(0x10000 + i));
    }

    function _board() internal view returns (NexArena.LeaderboardEntry[] memory e) {
        (e,) = arena.getLeaderboard(0, 1000);
    }

    function _assertBoardInvariant() internal view {
        NexArena.LeaderboardEntry[] memory e = _board();
        assertLe(e.length, TOP, "length > TOP_N");
        for (uint256 i = 0; i < e.length; i++) {
            assertGt(e[i].score, 0, "zero score on board");
            assertEq(uint256(e[i].score), uint256(arena.getPlayerStats(e[i].player).highScore), "board score != highScore");
            if (i > 0) assertGe(e[i - 1].score, e[i].score, "not sorted desc");
            for (uint256 j = 0; j < i; j++) {
                assertTrue(e[j].player != e[i].player, "duplicate player");
            }
        }
    }
}
