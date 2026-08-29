// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {INaviAdapterV2} from "../interfaces/INaviAdapterV2.sol";
import {IAavePool} from "../interfaces/IAavePool.sol";

/// @notice Fixed-reserve Aave canary adapter with per-action, per-user daily, and global daily limits.
contract AaveSupplyWithdrawAdapterV3 is INaviAdapterV2, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant ACTION_SUPPLY = 0;
    uint8 public constant ACTION_WITHDRAW = 1;

    struct Usage { uint256 day; uint256 amount; }

    address public immutable executor;
    IAavePool public immutable pool;
    IERC20 public immutable asset;
    IERC20 public immutable aToken;
    uint256 public immutable maxActionAmount;
    uint256 public immutable maxUserDailyAmount;
    uint256 public immutable maxGlobalDailyAmount;
    mapping(address user => Usage usage) public userUsage;
    Usage public globalUsage;

    error DailyLimitExceeded();
    error InvalidAction();
    error InvalidAmount();
    error InvalidConfiguration();
    error NativeValueNotAccepted();
    error OnlyExecutor();
    error UnexpectedProtocolResult();

    event AaveActionExecuted(address indexed user, bytes32 indexed strategyId, uint8 indexed action, uint256 amount);

    constructor(
        address executorAddress,
        address poolAddress,
        address assetAddress,
        address aTokenAddress,
        uint256 actionAmountCap,
        uint256 userDailyAmountCap,
        uint256 globalDailyAmountCap
    ) {
        if (
            executorAddress.code.length == 0 || poolAddress.code.length == 0 || assetAddress.code.length == 0
                || aTokenAddress.code.length == 0 || actionAmountCap == 0 || userDailyAmountCap < actionAmountCap
                || globalDailyAmountCap < userDailyAmountCap
        ) revert InvalidConfiguration();
        executor = executorAddress;
        pool = IAavePool(poolAddress);
        asset = IERC20(assetAddress);
        aToken = IERC20(aTokenAddress);
        maxActionAmount = actionAmountCap;
        maxUserDailyAmount = userDailyAmountCap;
        maxGlobalDailyAmount = globalDailyAmountCap;
    }

    // The local guard and executor-only entry prevent callbacks from reusing pre-call balance snapshots.
    // slither-disable-start reentrancy-balance
    function execute(address user, bytes calldata adapterData, bytes32 strategyId)
        external
        payable
        nonReentrant
        returns (bytes memory result)
    {
        if (msg.sender != executor) revert OnlyExecutor();
        if (msg.value != 0) revert NativeValueNotAccepted();
        (uint8 action, uint256 amount) = abi.decode(adapterData, (uint8, uint256));
        if (amount == 0 || amount > maxActionAmount) revert InvalidAmount();
        _consumeLimits(user, amount);

        if (action == ACTION_SUPPLY) {
            uint256 balanceBefore = asset.balanceOf(address(this));
            // slither-disable-next-line arbitrary-send-erc20 -- executor binds user to its authorized caller.
            asset.safeTransferFrom(user, address(this), amount);
            asset.forceApprove(address(pool), amount);
            pool.supply(address(asset), amount, user, 0);
            asset.forceApprove(address(pool), 0);
            if (asset.balanceOf(address(this)) != balanceBefore) revert UnexpectedProtocolResult();
        } else if (action == ACTION_WITHDRAW) {
            uint256 balanceBefore = aToken.balanceOf(address(this));
            // slither-disable-next-line arbitrary-send-erc20 -- executor binds user to its authorized caller.
            aToken.safeTransferFrom(user, address(this), amount);
            uint256 amountWithdrawn = pool.withdraw(address(asset), amount, user);
            if (amountWithdrawn != amount || aToken.balanceOf(address(this)) != balanceBefore) revert UnexpectedProtocolResult();
        } else {
            revert InvalidAction();
        }

        emit AaveActionExecuted(user, strategyId, action, amount);
        return abi.encode(action, amount);
    }
    // slither-disable-end reentrancy-balance

    function _consumeLimits(address user, uint256 amount) private {
        uint256 currentDay = block.timestamp / 1 days;
        Usage storage userState = userUsage[user];
        Usage storage globalState = globalUsage;
        uint256 userAmount = userState.day == currentDay ? userState.amount : 0;
        uint256 globalAmount = globalState.day == currentDay ? globalState.amount : 0;
        if (userAmount + amount > maxUserDailyAmount || globalAmount + amount > maxGlobalDailyAmount) revert DailyLimitExceeded();
        userState.day = currentDay;
        userState.amount = userAmount + amount;
        globalState.day = currentDay;
        globalState.amount = globalAmount + amount;
    }
}
