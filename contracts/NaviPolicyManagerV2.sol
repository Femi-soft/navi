// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stores domain-separated commitments to canonical, versioned NAVI policy documents.
contract NaviPolicyManagerV2 {
    error EmptyPolicyDocumentHash();

    bytes32 public constant POLICY_DOMAIN = keccak256("NAVI_POLICY_V2");

    struct Commitment {
        bytes32 documentHash;
        bytes32 commitmentHash;
        uint256 version;
    }

    mapping(address user => Commitment commitment) public commitments;
    event PolicyCommitted(address indexed user, bytes32 indexed documentHash, bytes32 commitmentHash, uint256 version);

    function commit(bytes32 documentHash) external returns (bytes32 commitmentHash, uint256 nextVersion) {
        if (documentHash == bytes32(0)) revert EmptyPolicyDocumentHash();
        nextVersion = commitments[msg.sender].version + 1;
        commitmentHash = keccak256(abi.encode(POLICY_DOMAIN, block.chainid, msg.sender, nextVersion, documentHash));
        commitments[msg.sender] = Commitment(documentHash, commitmentHash, nextVersion);
        emit PolicyCommitted(msg.sender, documentHash, commitmentHash, nextVersion);
    }
}
