// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Boundary implemented only by reviewed, protocol-specific NAVI adapters.
interface INaviAdapter {
    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        returns (bytes memory result);
}
