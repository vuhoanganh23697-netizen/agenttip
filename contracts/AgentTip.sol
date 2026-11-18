// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentTip
 * @notice Send BNB tips to anyone using their Agent ID.
 *         Both sender and receiver must hold a Binance Agent ID (name.ai).
 * @dev Agent ID contract: 0x60b9262456de011f7d15a54cdd8c48baaa8b022f (ERC-721, non-transferable)
 */

interface IAgentID {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgentTip {
    // ── State ────────────────────────────────────────────
    IAgentID public immutable agentID;

    struct Tip {
        address sender;
        address receiver;
        uint256 amount;
        string  message;
        uint256 timestamp;
    }

    Tip[] public allTips;

    mapping(address => uint256[]) public sentByAddress;
    mapping(address => uint256[]) public receivedByAddress;

    uint256 public totalTipCount;
    uint256 public totalVolume;
    uint256 public uniqueTippers;
    uint256 public uniqueReceivers;

    mapping(address => bool) private _isTipper;
    mapping(address => bool) private _isReceiver;

    // ── Events ───────────────────────────────────────────
    event TipSent(
        uint256 indexed tipId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string  message,
        uint256 timestamp
    );

    // ── Constructor ──────────────────────────────────────
    constructor(address _agentID) {
        agentID = IAgentID(_agentID);
    }

    // ── Core ─────────────────────────────────────────────
    /**
     * @notice Send a BNB tip to `_receiver` with an optional on-chain message.
     * @param _receiver  Wallet address of the tip recipient.
     * @param _message   Short message attached to the tip (stored on-chain).
     */
    function tip(address _receiver, string calldata _message) external payable {
        require(msg.value > 0, "Tip amount must be > 0");
        require(_receiver != address(0), "Invalid receiver address");
        require(_receiver != msg.sender, "Cannot tip yourself");
        require(agentID.balanceOf(msg.sender) > 0, "Sender must hold an Agent ID");
        require(agentID.balanceOf(_receiver) > 0, "Receiver must hold an Agent ID");

        uint256 tipId = allTips.length;

        allTips.push(Tip({
            sender:    msg.sender,
            receiver:  _receiver,
            amount:    msg.value,
            message:   _message,
            timestamp: block.timestamp
        }));

        sentByAddress[msg.sender].push(tipId);
        receivedByAddress[_receiver].push(tipId);

        totalTipCount++;
        totalVolume += msg.value;

        if (!_isTipper[msg.sender]) {
            _isTipper[msg.sender] = true;
            uniqueTippers++;
        }
        if (!_isReceiver[_receiver]) {
            _isReceiver[_receiver] = true;
            uniqueReceivers++;
        }

        // Transfer BNB directly to receiver — no protocol fee
        (bool ok, ) = payable(_receiver).call{value: msg.value}("");
        require(ok, "BNB transfer failed");

        emit TipSent(tipId, msg.sender, _receiver, msg.value, _message, block.timestamp);
    }

    // ── Views ────────────────────────────────────────────
    function getTip(uint256 _tipId) external view returns (Tip memory) {
        require(_tipId < allTips.length, "Tip does not exist");
        return allTips[_tipId];
    }

    function getSentTipIds(address _sender) external view returns (uint256[] memory) {
        return sentByAddress[_sender];
    }

    function getReceivedTipIds(address _receiver) external view returns (uint256[] memory) {
        return receivedByAddress[_receiver];
    }

    function getRecentTips(uint256 _count) external view returns (Tip[] memory) {
        uint256 len = allTips.length;
        if (_count > len) _count = len;

        Tip[] memory recent = new Tip[](_count);
        for (uint256 i = 0; i < _count; i++) {
            recent[i] = allTips[len - 1 - i];
        }
        return recent;
    }

    function getStats() external view returns (
        uint256 _totalTips,
        uint256 _totalVolume,
        uint256 _uniqueTippers,
        uint256 _uniqueReceivers
    ) {
        return (totalTipCount, totalVolume, uniqueTippers, uniqueReceivers);
    }

    function hasAgentID(address _addr) external view returns (bool) {
        return agentID.balanceOf(_addr) > 0;
    }
}
