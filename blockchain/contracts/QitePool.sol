// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QiteLiquidlityToken.sol";

contract QitePool {
    address public token1;
    address public token2;

    uint256 public reserve1;
    uint256 public reserve2;

    // x * y = k
    uint256 public constantK;

    // QiteLiquidlityToken public liquidityToken;



}