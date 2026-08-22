// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockERC4626Vault is ERC20, IERC4626 {
    using SafeERC20 for IERC20;

    IERC20 private immutable _asset;

    constructor(IERC20 asset_) ERC20("Mock Vault Share", "mvSHARE") {
        _asset = asset_;
    }

    function asset() external view returns (address) { return address(_asset); }
    function totalAssets() external view returns (uint256) { return _asset.balanceOf(address(this)); }
    function convertToShares(uint256 assets) external pure returns (uint256) { return assets; }
    function convertToAssets(uint256 shares) external pure returns (uint256) { return shares; }
    function maxDeposit(address) external pure returns (uint256) { return type(uint256).max; }
    function previewDeposit(uint256 assets) external pure returns (uint256) { return assets; }
    function maxMint(address) external pure returns (uint256) { return type(uint256).max; }
    function previewMint(uint256 shares) external pure returns (uint256) { return shares; }
    function maxWithdraw(address owner) external view returns (uint256) { return balanceOf(owner); }
    function previewWithdraw(uint256 assets) external pure returns (uint256) { return assets; }
    function maxRedeem(address owner) external view returns (uint256) { return balanceOf(owner); }
    function previewRedeem(uint256 shares) external pure returns (uint256) { return shares; }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        _asset.safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, assets);
        emit Deposit(msg.sender, receiver, assets, assets);
        return assets;
    }

    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        _asset.safeTransferFrom(msg.sender, address(this), shares);
        _mint(receiver, shares);
        emit Deposit(msg.sender, receiver, shares, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        if (msg.sender != owner) _spendAllowance(owner, msg.sender, assets);
        _burn(owner, assets);
        _asset.safeTransfer(receiver, assets);
        emit Withdraw(msg.sender, receiver, owner, assets, assets);
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        if (msg.sender != owner) _spendAllowance(owner, msg.sender, shares);
        _burn(owner, shares);
        _asset.safeTransfer(receiver, shares);
        emit Withdraw(msg.sender, receiver, owner, shares, shares);
        return shares;
    }
}
