// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stores user-authorized commitments to canonical, versioned NAVI policies.
contract NaviPolicyManager {
    error EmptyPolicyHash();

    struct Commitment {
        bytes32 policyHash;
        uint256 version;
    }

    mapping(address => Commitment) public commitments;
    event PolicyCommitted(address indexed user, bytes32 policyHash, uint256 version);

    function commit(bytes32 policyHash) external returns (uint256 nextVersion) {
        if (policyHash == bytes32(0)) revert EmptyPolicyHash();
        nextVersion = commitments[msg.sender].version + 1;
        commitments[msg.sender] = Commitment(policyHash, nextVersion);
        emit PolicyCommitted(msg.sender, policyHash, nextVersion);
    }
}
