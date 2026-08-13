// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Non-production architecture skeleton. Missing governance, pause, spend limits and audit.
contract NaviExecutor {
    address public immutable owner;
    mapping(address => bool) public approvedTargets;
    mapping(bytes4 => bool) public approvedSelectors;
    event ActionExecuted(address indexed user, address indexed target, bytes4 indexed selector, bytes32 strategyId);

    constructor() { owner = msg.sender; }
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    function setTarget(address target, bool approved) external onlyOwner { approvedTargets[target] = approved; }
    function setSelector(bytes4 selector, bool approved) external onlyOwner { approvedSelectors[selector] = approved; }

    function execute(address target, bytes calldata data, bytes32 strategyId) external returns (bytes memory result) {
        require(approvedTargets[target], "target blocked");
        require(data.length >= 4, "missing selector");
        bytes4 selector = bytes4(data[:4]);
        require(approvedSelectors[selector], "selector blocked");
        (bool ok, bytes memory returned) = target.call(data);
        require(ok, "call failed");
        emit ActionExecuted(msg.sender, target, selector, strategyId);
        return returned;
    }
}
