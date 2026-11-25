// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NexArena player-submitted arcade leaderboard
/// @notice Scores are player-submitted browser data, not verified gameplay.
/// This leaderboard is not cheat-proof: players can submit any score within the allowed range.
/// @dev Non-upgradeable and ownerless, with no administrative score controls or payment functions.
contract NexArena {
    uint256 public constant MAX_SCORE = 100_000_000;
    uint256 public constant TOP_N = 25;

    /// @dev Occupies two storage slots: scores in the first, remaining fields in the second.
    struct PlayerStats {
        uint128 highScore;
        uint128 latestScore;
        uint64 gamesPlayed;
        uint64 lastSubmittedAt;
        bool registered;
    }

    /// @dev Address and score together occupy one storage slot.
    struct LeaderboardEntry {
        address player;
        uint96 score;
    }

    error InvalidScore(uint256 score);
    error ZeroAddress();
    error TimestampOverflow();

    event PlayerRegistered(address indexed player);
    event ScoreSubmitted(
        address indexed player,
        uint256 score,
        uint256 highScore,
        uint256 gamesPlayed,
        bool newHighScore
    );

    mapping(address => PlayerStats) private _stats;
    address[] private _players;
    LeaderboardEntry[] private _leaderboard;

    /// @notice Records an unverified, player-submitted score for the caller only.
    /// @dev Only a strictly improved personal high score can change the top board.
    function submitScore(uint256 score) external {
        if (score == 0 || score > MAX_SCORE) revert InvalidScore(score);
        if (block.timestamp > type(uint64).max) revert TimestampOverflow();

        PlayerStats storage stats = _stats[msg.sender];
        if (!stats.registered) {
            stats.registered = true;
            _players.push(msg.sender);
            emit PlayerRegistered(msg.sender);
        }

        bool newHighScore = score > stats.highScore;
        // MAX_SCORE fits both uint128 player scores and uint96 leaderboard scores.
        if (newHighScore) stats.highScore = uint128(score);
        stats.latestScore = uint128(score);
        // Checked arithmetic prevents the counter from ever wrapping.
        stats.gamesPlayed++;
        stats.lastSubmittedAt = uint64(block.timestamp);

        if (newHighScore) _updateLeaderboard(msg.sender, uint96(score));

        emit ScoreSubmitted(msg.sender, score, stats.highScore, stats.gamesPlayed, newHighScore);
    }

    /// @notice Returns zeroed statistics for a player who has never submitted.
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        if (player == address(0)) revert ZeroAddress();
        return _stats[player];
    }

    /// @notice Returns a page of the descending, player-submitted top board and its current size.
    /// @dev Equal scores preserve achievement order. Out-of-range offsets return an empty page.
    function getLeaderboard(uint256 offset, uint256 limit)
        external
        view
        returns (LeaderboardEntry[] memory entries, uint256 total)
    {
        total = _leaderboard.length;
        if (offset >= total) return (new LeaderboardEntry[](0), total);

        uint256 count = total - offset;
        if (limit < count) count = limit;
        entries = new LeaderboardEntry[](count);
        for (uint256 i = 0; i < count; ++i) {
            entries[i] = _leaderboard[offset + i];
        }
    }

    function playerCount() external view returns (uint256) {
        return _players.length;
    }

    /// @notice Returns players in registration order, with offset and limit clamped to available entries.
    function getPlayers(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = _players.length;
        if (offset >= total) return new address[](0);

        uint256 count = total - offset;
        if (limit < count) count = limit;
        address[] memory players = new address[](count);
        for (uint256 i = 0; i < count; ++i) {
            players[i] = _players[offset + i];
        }
        return players;
    }

    /// @notice Returns a one-based rank, or zero if the player is not on the top board.
    function getLeaderboardRank(address player) external view returns (uint256 rank) {
        if (player == address(0)) revert ZeroAddress();
        uint256 length = _leaderboard.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_leaderboard[i].player == player) return i + 1;
        }
        return 0;
    }

    /// @dev Bounded by TOP_N. Remove any old entry before reinserting the improved score.
    function _updateLeaderboard(address player, uint96 score) private {
        uint256 length = _leaderboard.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_leaderboard[i].player == player) {
                for (uint256 j = i; j + 1 < length; ++j) {
                    _leaderboard[j] = _leaderboard[j + 1];
                }
                _leaderboard.pop();
                --length;
                break;
            }
        }

        if (length == TOP_N && score <= _leaderboard[length - 1].score) return;

        uint256 position;
        // Pass all equal scores so the earlier achiever remains higher ranked.
        while (position < length && _leaderboard[position].score >= score) {
            ++position;
        }

        if (length < TOP_N) _leaderboard.push();
        // If full, shifting overwrites the last entry and keeps the board bounded.
        for (uint256 i = _leaderboard.length - 1; i > position; --i) {
            _leaderboard[i] = _leaderboard[i - 1];
        }
        _leaderboard[position] = LeaderboardEntry({player: player, score: score});
    }
}
