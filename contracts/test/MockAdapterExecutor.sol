// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INaviAdapterV2} from "../interfaces/INaviAdapterV2.sol";

contract MockAdapterExecutor {
    function execute(address adapter, address user, bytes calldata data, bytes32 strategyId)
        external
        payable
        returns (bytes memory)
    {
        return INaviAdapterV2(adapter).execute{value: msg.value}(user, data, strategyId);
    }
}
