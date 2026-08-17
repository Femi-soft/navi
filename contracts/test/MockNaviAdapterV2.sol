// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INaviAdapterV2} from "../interfaces/INaviAdapterV2.sol";

contract MockNaviAdapterV2 is INaviAdapterV2 {
    address public immutable executor;
    address public lastUser;
    bytes32 public lastDataHash;
    bytes32 public lastStrategyId;
    uint256 public lastValue;

    error OnlyExecutor();

    constructor(address executorAddress) { executor = executorAddress; }

    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        payable
        returns (bytes memory result)
    {
        if (msg.sender != executor) revert OnlyExecutor();
        lastUser = user;
        lastDataHash = keccak256(adapterData);
        lastStrategyId = strategyId;
        lastValue = msg.value;
        return adapterData;
    }
}
