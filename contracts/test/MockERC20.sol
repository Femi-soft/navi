// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    address public immutable controller;

    constructor(string memory name_, string memory symbol_, address controller_) ERC20(name_, symbol_) {
        controller = controller_;
    }

    function mint(address account, uint256 amount) external {
        require(controller == address(0) || msg.sender == controller, "ONLY_CONTROLLER");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        require(msg.sender == controller, "ONLY_CONTROLLER");
        _burn(account, amount);
    }
}
