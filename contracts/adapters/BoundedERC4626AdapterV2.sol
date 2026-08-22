// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {INaviAdapterV2} from "../interfaces/INaviAdapterV2.sol";

/// @notice Immutable single-vault boundary for a verified synchronous ERC-4626 deployment.
contract BoundedERC4626AdapterV2 is INaviAdapterV2 {
    using SafeERC20 for IERC20;

    uint8 public constant ACTION_DEPOSIT = 0;
    uint8 public constant ACTION_REDEEM = 1;

    address public immutable executor;
    IERC4626 public immutable vault;
    IERC20 public immutable asset;
    uint256 public immutable maxAssetAmount;
    uint256 public immutable maxShareAmount;

    error OnlyExecutor();
    error NativeValueNotAccepted();
    error InvalidAction();
    error InvalidAmount();
    error InvalidConfiguration();
    error SlippageExceeded();
    error UnexpectedProtocolResult();

    event VaultActionExecuted(
        address indexed user,
        bytes32 indexed strategyId,
        uint8 indexed action,
        uint256 inputAmount,
        uint256 outputAmount
    );

    constructor(
        address executorAddress,
        address vaultAddress,
        address assetAddress,
        uint256 assetAmountCap,
        uint256 shareAmountCap
    ) {
        if (
            executorAddress.code.length == 0 || vaultAddress.code.length == 0
                || assetAddress.code.length == 0 || IERC4626(vaultAddress).asset() != assetAddress
                || assetAmountCap == 0 || shareAmountCap == 0
        ) revert InvalidConfiguration();

        executor = executorAddress;
        vault = IERC4626(vaultAddress);
        asset = IERC20(assetAddress);
        maxAssetAmount = assetAmountCap;
        maxShareAmount = shareAmountCap;
    }

    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        payable
        returns (bytes memory result)
    {
        if (msg.sender != executor) revert OnlyExecutor();
        if (msg.value != 0) revert NativeValueNotAccepted();

        (uint8 action, uint256 amount, uint256 minimumOutput) =
            abi.decode(adapterData, (uint8, uint256, uint256));
        uint256 outputAmount;

        if (action == ACTION_DEPOSIT) {
            if (amount == 0 || amount > maxAssetAmount) revert InvalidAmount();
            uint256 balanceBefore = asset.balanceOf(address(this));
            asset.safeTransferFrom(user, address(this), amount);
            asset.forceApprove(address(vault), amount);
            outputAmount = vault.deposit(amount, user);
            asset.forceApprove(address(vault), 0);
            if (asset.balanceOf(address(this)) != balanceBefore) revert UnexpectedProtocolResult();
        } else if (action == ACTION_REDEEM) {
            if (amount == 0 || amount > maxShareAmount) revert InvalidAmount();
            IERC20 shareToken = IERC20(address(vault));
            uint256 balanceBefore = shareToken.balanceOf(address(this));
            shareToken.safeTransferFrom(user, address(this), amount);
            outputAmount = vault.redeem(amount, user, address(this));
            if (shareToken.balanceOf(address(this)) != balanceBefore) revert UnexpectedProtocolResult();
        } else {
            revert InvalidAction();
        }

        if (outputAmount < minimumOutput) revert SlippageExceeded();
        emit VaultActionExecuted(user, strategyId, action, amount, outputAmount);
        return abi.encode(action, amount, outputAmount);
    }
}
