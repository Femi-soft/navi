// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INaviAdapter} from "./interfaces/INaviAdapter.sol";

/// @notice Testnet foundation for routing user-authorized actions through reviewed adapters.
/// @dev Deploys paused with an empty adapter allowlist. Adapters must enforce asset and amount bounds.
contract NaviExecutor is Ownable2Step, Pausable, ReentrancyGuard {
    error AdapterNotApproved(address adapter);
    error AdapterNotContract(address adapter);
    error EmptyStrategyId();

    mapping(address adapter => bool approved) public approvedAdapters;

    event AdapterApprovalSet(address indexed adapter, bool approved);
    event ActionExecuted(
        address indexed user,
        address indexed adapter,
        bytes32 indexed strategyId,
        bytes32 adapterDataHash
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        _pause();
    }

    function setAdapter(address adapter, bool approved) external onlyOwner {
        if (approved && adapter.code.length == 0) revert AdapterNotContract(adapter);
        approvedAdapters[adapter] = approved;
        emit AdapterApprovalSet(adapter, approved);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function execute(address adapter, bytes calldata adapterData, bytes32 strategyId)
        external
        whenNotPaused
        nonReentrant
        returns (bytes memory result)
    {
        if (!approvedAdapters[adapter]) revert AdapterNotApproved(adapter);
        if (strategyId == bytes32(0)) revert EmptyStrategyId();

        result = INaviAdapter(adapter).execute(msg.sender, adapterData, strategyId);
        emit ActionExecuted(msg.sender, adapter, strategyId, keccak256(adapterData));
    }
}
