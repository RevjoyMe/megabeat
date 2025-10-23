// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MegaBeat
 * @dev On-chain rhythm game with 10ms precision
 * Leverages MegaETH's 10ms blocks for perfect timing
 */
contract MegaBeat is Ownable {
    struct Player {
        uint256 clicks;
        uint256 clickPower;
        uint256 autoClickerRate; // clicks per second
        uint256 lastAutoClickTime;
        uint256[] ownedUpgrades;
    }

    struct Upgrade {
        string name;
        uint256 cost;
        uint256 clickPowerBoost;
        uint256 autoClickBoost;
        bool isNFT;
        uint256 supply;
        uint256 minted;
    }

    mapping(address => Player) public players;
    mapping(uint256 => Upgrade) public upgrades;
    mapping(uint256 => address) public upgradeOwners; // NFT tokenId => owner
    
    uint256 public totalUpgrades;
    uint256 public nextTokenId = 1;
    
    address[] public leaderboard;
    mapping(address => uint256) public leaderboardIndex;

    event Clicked(address indexed player, uint256 clicks, uint256 power);
    event UpgradePurchased(address indexed player, uint256 upgradeId, uint256 cost);
    event LeaderboardUpdated(address indexed player, uint256 totalClicks);

    constructor() Ownable(msg.sender) {
        // Initialize basic upgrades
        _addUpgrade("Mouse", 10, 1, 0, false, 0);
        _addUpgrade("Auto Clicker", 50, 0, 1, false, 0);
        _addUpgrade("Gaming Mouse", 200, 5, 0, false, 0);
        _addUpgrade("Macro Script", 500, 0, 10, false, 0);
        _addUpgrade("Golden Cursor NFT", 1000, 50, 50, true, 100);
        _addUpgrade("Legendary Bot NFT", 5000, 200, 500, true, 10);
    }

    function _addUpgrade(
        string memory name,
        uint256 cost,
        uint256 clickPowerBoost,
        uint256 autoClickBoost,
        bool isNFT,
        uint256 supply
    ) private {
        upgrades[totalUpgrades] = Upgrade({
            name: name,
            cost: cost,
            clickPowerBoost: clickPowerBoost,
            autoClickBoost: autoClickBoost,
            isNFT: isNFT,
            supply: supply,
            minted: 0
        });
        totalUpgrades++;
    }

    function click() external {
        Player storage player = players[msg.sender];
        
        // Process auto clicks
        _processAutoClicks(msg.sender);
        
        // Manual click
        uint256 clickValue = 1 + player.clickPower;
        player.clicks += clickValue;

        emit Clicked(msg.sender, player.clicks, clickValue);
        _updateLeaderboard(msg.sender);
    }

    function multiClick(uint256 times) external {
        require(times > 0 && times <= 100, "Invalid click count");
        Player storage player = players[msg.sender];
        
        _processAutoClicks(msg.sender);
        
        uint256 clickValue = (1 + player.clickPower) * times;
        player.clicks += clickValue;

        emit Clicked(msg.sender, player.clicks, clickValue);
        _updateLeaderboard(msg.sender);
    }

    function _processAutoClicks(address playerAddr) private {
        Player storage player = players[playerAddr];
        
        if (player.autoClickerRate > 0 && player.lastAutoClickTime > 0) {
            uint256 timePassed = block.timestamp - player.lastAutoClickTime;
            uint256 autoClicks = timePassed * player.autoClickerRate;
            player.clicks += autoClicks;
        }
        
        player.lastAutoClickTime = block.timestamp;
    }

    function buyUpgrade(uint256 upgradeId) external {
        require(upgradeId < totalUpgrades, "Invalid upgrade");
        Upgrade storage upgrade = upgrades[upgradeId];
        Player storage player = players[msg.sender];

        require(player.clicks >= upgrade.cost, "Not enough clicks");
        
        if (upgrade.isNFT) {
            require(upgrade.minted < upgrade.supply, "Sold out");
            upgrade.minted++;
            
            // Mint NFT (simplified for demo)
            uint256 tokenId = nextTokenId++;
            upgradeOwners[tokenId] = msg.sender;
        }

        player.clicks -= upgrade.cost;
        player.clickPower += upgrade.clickPowerBoost;
        player.autoClickerRate += upgrade.autoClickBoost;
        player.ownedUpgrades.push(upgradeId);

        if (player.lastAutoClickTime == 0) {
            player.lastAutoClickTime = block.timestamp;
        }

        emit UpgradePurchased(msg.sender, upgradeId, upgrade.cost);
        _updateLeaderboard(msg.sender);
    }

    function _updateLeaderboard(address player) private {
        uint256 idx = leaderboardIndex[player];
        
        // Add to leaderboard if new player
        if (idx == 0 && (leaderboard.length == 0 || leaderboard[0] != player)) {
            leaderboard.push(player);
            leaderboardIndex[player] = leaderboard.length;
            idx = leaderboard.length;
        }

        // Bubble up
        while (idx > 1) {
            address prevPlayer = leaderboard[idx - 2];
            if (players[player].clicks > players[prevPlayer].clicks) {
                leaderboard[idx - 1] = prevPlayer;
                leaderboard[idx - 2] = player;
                leaderboardIndex[prevPlayer] = idx;
                leaderboardIndex[player] = idx - 1;
                idx--;
            } else {
                break;
            }
        }

        emit LeaderboardUpdated(player, players[player].clicks);
    }

    function getPlayer(address playerAddr) external view returns (
        uint256 clicks,
        uint256 clickPower,
        uint256 autoClickerRate,
        uint256 pendingAutoClicks,
        uint256[] memory ownedUpgrades
    ) {
        Player storage player = players[playerAddr];
        
        uint256 pending = 0;
        if (player.autoClickerRate > 0 && player.lastAutoClickTime > 0) {
            uint256 timePassed = block.timestamp - player.lastAutoClickTime;
            pending = timePassed * player.autoClickerRate;
        }

        return (
            player.clicks,
            player.clickPower,
            player.autoClickerRate,
            pending,
            player.ownedUpgrades
        );
    }

    function getLeaderboard(uint256 count) external view returns (
        address[] memory players_,
        uint256[] memory clicks_
    ) {
        uint256 size = count < leaderboard.length ? count : leaderboard.length;
        players_ = new address[](size);
        clicks_ = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            players_[i] = leaderboard[i];
            clicks_[i] = players[leaderboard[i]].clicks;
        }

        return (players_, clicks_);
    }

    function getUpgrade(uint256 upgradeId) external view returns (
        string memory name,
        uint256 cost,
        uint256 clickPowerBoost,
        uint256 autoClickBoost,
        bool isNFT,
        uint256 supply,
        uint256 minted
    ) {
        Upgrade storage upgrade = upgrades[upgradeId];
        return (
            upgrade.name,
            upgrade.cost,
            upgrade.clickPowerBoost,
            upgrade.autoClickBoost,
            upgrade.isNFT,
            upgrade.supply,
            upgrade.minted
        );
    }
}

