// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QiteLiquidlityToken.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract QitePool {

    using SafeMath for uint256; 
    using Math for uint256;

    address public token1;
    address public token2;

    uint256 public reserve1;
    uint256 public reserve2;

    // x * y = k
    uint256 public constantK;

    // QiteLiquidlityToken public liquidityToken;
    QiteLiquidlityToken public liquidityToken;


    event Swap (address indexed sender,
    uint256 amountIn,uint256 amountOut, address fromToken,address toToken);

    constructor(address _token1, address _token2, string memory _liquidityTokenName, string memory _liquidityTokenSymbol){
        token1 = _token1;
        token2 = _token2;
        liquidityToken = new QiteLiquidlityToken(_liquidityTokenName,_liquidityTokenSymbol);
    }

    function addLiquidity(uint256 amountToken1,uint256 amountToken2) external{
        
        uint256 liquidity;
        uint256 totalSupplyOfToken = liquidityToken.totalSupply();

        if(totalSupplyOfToken == 0){
        liquidity = amountToken1.mul(amountToken2).sqrt();
        }
        else{
        // select minimum
        // amountToken1 * totalSupplyLiqudityToken / Reserve1, amountToken2 * totalSupplyLiqudityToken / Reserve2 
        liquidity = amountToken1.mul(totalSupplyOfToken).div(reserve1).min(amountToken2.mul(totalSupplyOfToken).div(reserve2)); 
        }
        liquidityToken.mint(msg.sender,liquidity);
        require(IERC20(token1).transferFrom(msg.sender,address(this),amountToken1),"Transfer of token1 is fail");
        require(IERC20(token2).transferFrom(msg.sender,address(this),amountToken2),"Transfer of token2 is fail");

        reserve1 += amountToken1;
        reserve2 += amountToken2;

        _updateConstantFormula();
    }
    

    function swapTokens(address fromToken,address toToken,uint256 amountIn,uint256 amountOut) external {
        // Make some checks
        require(amountIn>0 && amountOut>0, "Amount must be greater than zero");
        require((fromToken == token1 && toToken == token2) || (fromToken == token2 && toToken == token1), "Tokens need to be pairs of this liquidity pools");
        IERC20 fromTokenContract = IERC20(fromToken);
        IERC20 toTokenContract = IERC20(toToken);    
        require(fromTokenContract.balanceOf(msg.sender) > amountIn,"Insufficent balance of tokenFrom");
        require(toTokenContract.balanceOf(address(this)) > amountOut,"Insufficent balance of tokenFrom");
       
        // Verify that amountOut is less or equal to expectedAmount after calculation
        uint256 expectedAmount;
        if(fromToken == token1 && toToken == token2){
            expectedAmount = constantK.div(reserve1.sub(amountIn)).sub(reserve2);
        }
        else{
           expectedAmount = constantK.div(reserve2.sub(amountIn)).sub(reserve1);       
   }
        require(amountOut <= expectedAmount, "Swap does not preserve constant formula");
    
        // Perform the swap,
        require(fromTokenContract.transferFrom(msg.sender,address(this),amountIn),"Transfer of token from failed");
        require(toTokenContract.transfer(msg.sender,expectedAmount),"Transfer of token from failed");

        // Update the reserve1 and reserve2
        if(fromToken == token1 && toToken == token2){
            reserve1 = reserve1.add(amountIn);
            reserve2 = reserve2.sub(expectedAmount);
        }
        else{
            reserve1 = reserve1.sub(expectedAmount);
            reserve2 = reserve2.add(amountIn);
        }
        // check that the result is maintaining the constant formula
        require(reserve1.mul(reserve2) <= constantK, "Swap does not preserve coonstant formula");
        _updateConstantFormula();
        // add events
        emit Swap(msg.sender,amountIn,expectedAmount,fromToken,toToken);
    }

    function removeLiquidity(uint amountOfLiquidity) external {
        uint256 totalSupply = liquidityToken.totalSupply();
        require(amountOfLiquidity <= totalSupply,"Liquidity is more than total supply");
        // Burn the liquidity amount
        liquidityToken.burn(msg.sender,amountOfLiquidity);
        // transfer token1 and token2 to liquidity provider or msg.sender
       uint256 amount1 = reserve1.mul(amountOfLiquidity).div(totalSupply);
       uint256 amount2 = reserve2.mul(amountOfLiquidity).div(totalSupply);

        require(IERC20(token1).transfer(msg.sender,amount1),"Transfer of token1 failed");
        require(IERC20(token2).transfer(msg.sender,amount2),"Transfer of token2 failed");

        // update reserve1 and reserve2
        reserve1 -= amount1;
        reserve2 -= amount2;
        // update the constant formula
    }

    function _updateConstantFormula() internal {
        
        constantK = reserve1.mul(reserve2);
        require(constantK > 0 , "Constant formula not update");
    }

    function estimateOutputAmount(uint256 amountIn,address fromToken) public view returns(uint256 expectedAmount){
        require(amountIn>0, "Amount must be greater than zero");
        require((fromToken == token1 ) || (fromToken == token2 ), "Tokens need to be pairs of this liquidity pools");

         if(fromToken == token1){
            expectedAmount = constantK.div(reserve1.sub(amountIn)).sub(reserve2);
        }
        else{
           expectedAmount = constantK.div(reserve2.sub(amountIn)).sub(reserve1);       
   }
   
    }


}