// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Scaffold only. Must be audited before deployment with real value.
contract NaviPolicyManager {
    struct Commitment { bytes32 policyHash; uint256 version; }
    mapping(address => Commitment) public commitments;
    event PolicyCommitted(address indexed user, bytes32 policyHash, uint256 version);

    function commit(bytes32 policyHash) external {
        require(policyHash != bytes32(0), "empty policy");
        uint256 nextVersion = commitments[msg.sender].version + 1;
        commitments[msg.sender] = Commitment(policyHash, nextVersion);
        emit PolicyCommitted(msg.sender, policyHash, nextVersion);
    }
}
