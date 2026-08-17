// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INaviAdapter} from "../interfaces/INaviAdapter.sol";

contract MockNaviAdapter is INaviAdapter {
    address public lastUser;
    bytes32 public lastDataHash;
    bytes32 public lastStrategyId;

    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        returns (bytes memory result)
    {
        lastUser = user;
        lastDataHash = keccak256(adapterData);
        lastStrategyId = strategyId;
        return adapterData;
    }
}
