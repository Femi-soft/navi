// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAavePool} from "../interfaces/IAavePool.sol";
import {MockERC20} from "./MockERC20.sol";

contract MockAavePool is IAavePool {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    MockERC20 public immutable aToken;

    constructor(address assetAddress) {
        asset = IERC20(assetAddress);
        aToken = new MockERC20("Mock Aave USDC", "maUSDC", address(this));
    }

    function supply(address assetAddress, uint256 amount, address onBehalfOf, uint16) external {
        require(assetAddress == address(asset), "WRONG_ASSET");
        asset.safeTransferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address assetAddress, uint256 amount, address to) external returns (uint256) {
        require(assetAddress == address(asset), "WRONG_ASSET");
        aToken.burn(msg.sender, amount);
        asset.safeTransfer(to, amount);
        return amount;
    }
}
