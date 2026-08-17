// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INaviAdapterV2} from "./interfaces/INaviAdapterV2.sol";
import {INaviPolicyManagerV2} from "./interfaces/INaviPolicyManagerV2.sol";

/// @notice Audit candidate that binds every action to current policy and expiring simulation evidence.
contract NaviExecutorV2 is Ownable2Step, Pausable, ReentrancyGuard {
    error AdapterNotApproved(address adapter);
    error AdapterNotContract(address adapter);
    error EmptyEvidence();
    error EvidenceExpired();
    error PolicyCommitmentMismatch();
    error SimulationAlreadyConsumed();
    error InvalidPolicyManager();

    INaviPolicyManagerV2 public immutable policyManager;
    mapping(address adapter => bool approved) public approvedAdapters;
    mapping(address user => mapping(bytes32 simulationHash => bool consumed)) public consumedSimulations;

    struct ExecutionEvidence {
        bytes32 strategyId;
        bytes32 simulationHash;
        bytes32 policyCommitmentHash;
        uint256 policyVersion;
        uint256 deadline;
    }

    event AdapterApprovalSet(address indexed adapter, bool approved);
    event ActionExecuted(
        address indexed user,
        address indexed adapter,
        bytes32 indexed strategyId,
        bytes32 simulationHash,
        bytes32 policyCommitmentHash,
        uint256 policyVersion,
        bytes32 adapterDataHash,
        uint256 value
    );

    constructor(address initialOwner, address policyManagerAddress) Ownable(initialOwner) {
        if (policyManagerAddress.code.length == 0) revert InvalidPolicyManager();
        policyManager = INaviPolicyManagerV2(policyManagerAddress);
        _pause();
    }

    function setAdapter(address adapter, bool approved) external onlyOwner {
        if (approved && adapter.code.length == 0) revert AdapterNotContract(adapter);
        approvedAdapters[adapter] = approved;
        emit AdapterApprovalSet(adapter, approved);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function execute(
        address adapter,
        bytes calldata adapterData,
        ExecutionEvidence calldata evidence
    ) external payable whenNotPaused nonReentrant returns (bytes memory result) {
        if (!approvedAdapters[adapter]) revert AdapterNotApproved(adapter);
        if (evidence.strategyId == bytes32(0) || evidence.simulationHash == bytes32(0) || evidence.policyCommitmentHash == bytes32(0)) revert EmptyEvidence();
        // slither-disable-next-line timestamp
        if (block.timestamp > evidence.deadline) revert EvidenceExpired();
        (bytes32 currentDocumentHash, bytes32 currentCommitmentHash, uint256 currentVersion) = policyManager.commitments(msg.sender);
        if (currentDocumentHash == bytes32(0) || currentCommitmentHash != evidence.policyCommitmentHash || currentVersion != evidence.policyVersion) revert PolicyCommitmentMismatch();
        if (consumedSimulations[msg.sender][evidence.simulationHash]) revert SimulationAlreadyConsumed();
        consumedSimulations[msg.sender][evidence.simulationHash] = true;

        result = INaviAdapterV2(adapter).execute{value: msg.value}(msg.sender, adapterData, evidence.strategyId);
        emit ActionExecuted(msg.sender, adapter, evidence.strategyId, evidence.simulationHash, evidence.policyCommitmentHash, evidence.policyVersion, keccak256(adapterData), msg.value);
    }
}
