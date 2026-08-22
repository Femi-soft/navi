// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {INaviAdapterV2} from "../interfaces/INaviAdapterV2.sol";
import {IAavePool} from "../interfaces/IAavePool.sol";

/// @notice Bounded adapter for one Aave pool reserve. It cannot borrow, swap, or select arbitrary targets.
contract AaveSupplyWithdrawAdapterV2 is INaviAdapterV2 {
    using SafeERC20 for IERC20;

    uint8 public constant ACTION_SUPPLY = 0;
    uint8 public constant ACTION_WITHDRAW = 1;

    address public immutable executor;
    IAavePool public immutable pool;
    IERC20 public immutable asset;
    IERC20 public immutable aToken;
    uint256 public immutable maxActionAmount;

    error OnlyExecutor();
    error NativeValueNotAccepted();
    error InvalidAction();
    error InvalidAmount();
    error InvalidConfiguration();
    error UnexpectedProtocolResult();

    event AaveActionExecuted(
        address indexed user,
        bytes32 indexed strategyId,
        uint8 indexed action,
        uint256 amount
    );

    constructor(
        address executorAddress,
        address poolAddress,
        address assetAddress,
        address aTokenAddress,
        uint256 actionAmountCap
    ) {
        if (
            executorAddress.code.length == 0 || poolAddress.code.length == 0
                || assetAddress.code.length == 0 || aTokenAddress.code.length == 0
                || actionAmountCap == 0
        ) revert InvalidConfiguration();

        executor = executorAddress;
        pool = IAavePool(poolAddress);
        asset = IERC20(assetAddress);
        aToken = IERC20(aTokenAddress);
        maxActionAmount = actionAmountCap;
    }

    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        payable
        returns (bytes memory result)
    {
        if (msg.sender != executor) revert OnlyExecutor();
        if (msg.value != 0) revert NativeValueNotAccepted();

        (uint8 action, uint256 amount) = abi.decode(adapterData, (uint8, uint256));
        if (amount == 0 || amount > maxActionAmount) revert InvalidAmount();

        if (action == ACTION_SUPPLY) {
            uint256 balanceBefore = asset.balanceOf(address(this));
            asset.safeTransferFrom(user, address(this), amount);
            asset.forceApprove(address(pool), amount);
            pool.supply(address(asset), amount, user, 0);
            asset.forceApprove(address(pool), 0);
            if (asset.balanceOf(address(this)) != balanceBefore) revert UnexpectedProtocolResult();
        } else if (action == ACTION_WITHDRAW) {
            uint256 balanceBefore = aToken.balanceOf(address(this));
            aToken.safeTransferFrom(user, address(this), amount);
            uint256 amountWithdrawn = pool.withdraw(address(asset), amount, user);
            if (amountWithdrawn != amount || aToken.balanceOf(address(this)) != balanceBefore) {
                revert UnexpectedProtocolResult();
            }
        } else {
            revert InvalidAction();
        }

        emit AaveActionExecuted(user, strategyId, action, amount);
        return abi.encode(action, amount);
    }
}
