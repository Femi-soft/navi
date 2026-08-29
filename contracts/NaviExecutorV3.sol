// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INaviAdapterV2} from "./interfaces/INaviAdapterV2.sol";
import {INaviPolicyManagerV2} from "./interfaces/INaviPolicyManagerV2.sol";

/// @notice Base Sepolia canary executor. Every action requires current policy and NAVI-signed simulation evidence.
contract NaviExecutorV3 is Ownable2Step, Pausable, ReentrancyGuard {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("NAVI Executor");
    bytes32 private constant VERSION_HASH = keccak256("3");
    uint256 private constant SECP256K1_HALF_ORDER = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    bytes32 public constant EXECUTION_AUTHORIZATION_TYPEHASH = keccak256(
        "ExecutionAuthorization(address user,address adapter,bytes32 adapterDataHash,bytes32 strategyId,bytes32 simulationHash,bytes32 policyCommitmentHash,uint256 policyVersion,uint256 deadline)"
    );

    error AdapterNotApproved(address adapter);
    error AdapterNotContract(address adapter);
    error EmptyEvidence();
    error EvidenceExpired();
    error EvidenceSignerInvalid();
    error InvalidPolicyManager();
    error PolicyCommitmentMismatch();
    error SimulationAlreadyConsumed();
    error UserNotAllowed(address user);

    struct ExecutionEvidence {
        bytes32 strategyId;
        bytes32 simulationHash;
        bytes32 policyCommitmentHash;
        uint256 policyVersion;
        uint256 deadline;
    }

    INaviPolicyManagerV2 public immutable policyManager;
    bytes32 public immutable DOMAIN_SEPARATOR;
    address public evidenceSigner;
    mapping(address adapter => bool approved) public approvedAdapters;
    mapping(address user => bool allowed) public allowedUsers;
    mapping(address user => mapping(bytes32 simulationHash => bool consumed)) public consumedSimulations;

    event AdapterApprovalSet(address indexed adapter, bool approved);
    event CanaryUserSet(address indexed user, bool allowed);
    event EvidenceSignerSet(address indexed previousSigner, address indexed newSigner);
    event ActionExecuted(
        address indexed user,
        address indexed adapter,
        bytes32 indexed strategyId,
        bytes32 simulationHash,
        bytes32 policyCommitmentHash,
        uint256 policyVersion,
        bytes32 adapterDataHash
    );

    constructor(address initialOwner, address policyManagerAddress, address initialEvidenceSigner)
        Ownable(initialOwner)
    {
        if (policyManagerAddress.code.length == 0) revert InvalidPolicyManager();
        if (initialEvidenceSigner == address(0)) revert EvidenceSignerInvalid();
        policyManager = INaviPolicyManagerV2(policyManagerAddress);
        evidenceSigner = initialEvidenceSigner;
        DOMAIN_SEPARATOR = keccak256(abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
        _pause();
    }

    function setAdapter(address adapter, bool approved) external onlyOwner {
        if (approved && adapter.code.length == 0) revert AdapterNotContract(adapter);
        approvedAdapters[adapter] = approved;
        emit AdapterApprovalSet(adapter, approved);
    }

    function setCanaryUser(address user, bool allowed) external onlyOwner {
        if (user == address(0)) revert UserNotAllowed(user);
        allowedUsers[user] = allowed;
        emit CanaryUserSet(user, allowed);
    }

    function setEvidenceSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert EvidenceSignerInvalid();
        address previous = evidenceSigner;
        evidenceSigner = newSigner;
        emit EvidenceSignerSet(previous, newSigner);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function authorizationDigest(address user, address adapter, bytes calldata adapterData, ExecutionEvidence calldata evidence)
        external
        view
        returns (bytes32)
    {
        return _authorizationDigest(user, adapter, keccak256(adapterData), evidence);
    }

    function execute(
        address adapter,
        bytes calldata adapterData,
        ExecutionEvidence calldata evidence,
        bytes calldata authorization
    ) external whenNotPaused nonReentrant returns (bytes memory result) {
        if (!allowedUsers[msg.sender]) revert UserNotAllowed(msg.sender);
        if (!approvedAdapters[adapter]) revert AdapterNotApproved(adapter);
        if (evidence.strategyId == bytes32(0) || evidence.simulationHash == bytes32(0) || evidence.policyCommitmentHash == bytes32(0)) revert EmptyEvidence();
        // slither-disable-next-line timestamp
        if (block.timestamp > evidence.deadline) revert EvidenceExpired();
        (bytes32 currentDocumentHash, bytes32 currentCommitmentHash, uint256 currentVersion) = policyManager.commitments(msg.sender);
        if (currentDocumentHash == bytes32(0) || currentCommitmentHash != evidence.policyCommitmentHash || currentVersion != evidence.policyVersion) revert PolicyCommitmentMismatch();
        if (consumedSimulations[msg.sender][evidence.simulationHash]) revert SimulationAlreadyConsumed();
        bytes32 adapterDataHash = keccak256(adapterData);
        address recovered = _recover(_authorizationDigest(msg.sender, adapter, adapterDataHash, evidence), authorization);
        if (recovered != evidenceSigner) revert EvidenceSignerInvalid();
        consumedSimulations[msg.sender][evidence.simulationHash] = true;

        result = INaviAdapterV2(adapter).execute(msg.sender, adapterData, evidence.strategyId);
        emit ActionExecuted(msg.sender, adapter, evidence.strategyId, evidence.simulationHash, evidence.policyCommitmentHash, evidence.policyVersion, adapterDataHash);
    }

    function _authorizationDigest(address user, address adapter, bytes32 adapterDataHash, ExecutionEvidence calldata evidence)
        private
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(
            EXECUTION_AUTHORIZATION_TYPEHASH,
            user,
            adapter,
            adapterDataHash,
            evidence.strategyId,
            evidence.simulationHash,
            evidence.policyCommitmentHash,
            evidence.policyVersion,
            evidence.deadline
        ));
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address signer) {
        if (signature.length != 65) revert EvidenceSignerInvalid();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > SECP256K1_HALF_ORDER || (v != 27 && v != 28)) revert EvidenceSignerInvalid();
        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert EvidenceSignerInvalid();
    }
}
