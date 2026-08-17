// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Boundary implemented only by reviewed, protocol-specific NAVI adapters.
interface INaviAdapterV2 {
    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        payable
        returns (bytes memory result);
}
