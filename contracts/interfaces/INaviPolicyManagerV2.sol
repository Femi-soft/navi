// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface INaviPolicyManagerV2 {
    function commitments(address user)
        external
        view
        returns (bytes32 documentHash, bytes32 commitmentHash, uint256 version);
}
