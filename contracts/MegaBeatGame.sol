// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MegaBeatGame
 * @dev On-chain rhythm game with 10ms precision timing
 */
contract MegaBeatGame is Ownable {
    struct Song {
        string name;
        uint64[] noteBlocks;
        uint256 entryFee;
    }
    
    struct GameSession {
        address player;
        uint256 songId;
        uint64 startBlock;
        uint256 score;
        uint256 currentNoteIndex;
        bool active;
    }
    
    mapping(uint256 => Song) public songs;
    mapping(address => GameSession) public activeGames;
    uint256 public nextSongId;
    
    event GameStarted(address indexed player, uint256 songId, uint64 startBlock);
    event NoteHit(address indexed player, uint256 noteIndex, uint256 score);
    event NoteMiss(address indexed player, uint256 noteIndex);
    event GameFinished(address indexed player, uint256 finalScore);
    
    constructor() Ownable(msg.sender) {
        _createDemoSong();
    }
    
    function _createDemoSong() private {
        uint64[] memory notes = new uint64[](5);
        notes[0] = 200;
        notes[1] = 300;
        notes[2] = 400;
        notes[3] = 500;
        notes[4] = 600;
        
        songs[0] = Song({
            name: "Demo Song",
            noteBlocks: notes,
            entryFee: 0.001 ether
        });
        nextSongId = 1;
    }
    
    function startGame(uint256 songId) external payable {
        require(songId < nextSongId, "Song not found");
        require(msg.value == songs[songId].entryFee, "Incorrect fee");
        require(!activeGames[msg.sender].active, "Game already active");
        
        activeGames[msg.sender] = GameSession({
            player: msg.sender,
            songId: songId,
            startBlock: uint64(block.number + 200),
            score: 0,
            currentNoteIndex: 0,
            active: true
        });
        
        emit GameStarted(msg.sender, songId, uint64(block.number + 200));
    }
    
    function hitNote(uint256 noteIndex) external {
        GameSession storage game = activeGames[msg.sender];
        require(game.active, "No active game");
        require(noteIndex == game.currentNoteIndex, "Wrong note");
        
        Song storage song = songs[game.songId];
        require(noteIndex < song.noteBlocks.length, "Invalid note");
        
        uint64 targetBlock = game.startBlock + song.noteBlocks[noteIndex];
        uint256 score;
        
        if (block.number == targetBlock) {
            score = 100;
        } else if (block.number == targetBlock - 1 || block.number == targetBlock + 1) {
            score = 50;
        } else {
            score = 0;
            emit NoteMiss(msg.sender, noteIndex);
        }
        
        game.score += score;
        game.currentNoteIndex++;
        
        if (score > 0) {
            emit NoteHit(msg.sender, noteIndex, score);
        }
        
        if (game.currentNoteIndex >= song.noteBlocks.length) {
            emit GameFinished(msg.sender, game.score);
            game.active = false;
        }
    }
    
    function getGame(address player) external view returns (GameSession memory) {
        return activeGames[player];
    }
}

