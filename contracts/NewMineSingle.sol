// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './uniswapv2/interfaces/IUniswapV2Pair.sol';

// NewMine is the master of NewFarm. He can distribute New and he is a fair guy.
contract NewMineSingle is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of New
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * accNewPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accNewPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each user that stakes LP tokens.
    mapping (address => UserInfo) public userInfo;

    // Address of LP token contract.
    IERC20 public lpToken;
    // Last block number that New distribution occurs.
    uint256 public lastRewardBlock;
    // Accumulated new per share, times 1e12. See below.
    uint256 public accNewPerShare;

    uint256 public newSupply;
    // new tokens created per block.
    uint256 public newPerBlock;

    // The block number when New mining finish.
    uint256 public endBlock;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        address _lpToken,
        uint256 _newPerBlock,
        uint256 _startBlock,
        uint256 _endBlock
    ) public {
        lpToken = IERC20(_lpToken);
        newPerBlock = _newPerBlock;

        lastRewardBlock = block.number > _startBlock ? block.number : _startBlock;
        endBlock = _endBlock;
    }

    ///////////////////////////////////////////////////
    //            function for Owner                 //
    ///////////////////////////////////////////////////

    // Withdraw New. EMERGENCY ONLY.
    function emergencyWithdrawNew(address payable _to) public onlyOwner {
        Address.sendValue(_to, address(this).balance);
    }

    event Activated(uint256 _endBlock, uint256 _newPerBlock);
    // activate all pool after stop mining
    function activate(uint256 _endBlock, uint256 _newPerBlock) public onlyOwner {
        updatePool();
        endBlock = _endBlock;
        newPerBlock = _newPerBlock;

        emit Activated(_endBlock, _newPerBlock);
    }

    // Update reward variables of the pool to be up-to-date.
    function updatePool() public {
        if (block.number <= lastRewardBlock) {
            return;
        }
        uint256 lpSupply = lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 newReward = getMultiplier(lastRewardBlock, block.number);
        newSupply = newSupply.add(newReward);
        accNewPerShare = accNewPerShare.add(newReward.mul(1e12).div(lpSupply));
        lastRewardBlock = block.number;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= endBlock) {
            return _to.sub(_from).mul(newPerBlock);
        } else if (_from >= endBlock) {
            return 0;
        } else {
            return endBlock.sub(_from).mul(newPerBlock);
        }
    }

    ///////////////////////////////////////////////////
    //       function for Miner                      //
    ///////////////////////////////////////////////////

    // 收割new用这个函数或withdraw，_amount=0即可
    // Deposit LP tokens to NewMine for NEW allocation.
    function deposit(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(accNewPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                Address.sendValue(msg.sender, pending);
            }
        }

        if(_amount > 0) {
            lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
        }
        user.rewardDebt = user.amount.mul(accNewPerShare).div(1e12);
        emit Deposit(msg.sender, _amount);        
    }

    // 收割new用这个函数或deposit，_amount=0即可
    // Withdraw LP tokens from NewMine.
    function withdraw(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool();
        uint256 pending = user.amount.mul(accNewPerShare).div(1e12).sub(user.rewardDebt);
        if(pending > 0) {
            Address.sendValue(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = user.amount.mul(accNewPerShare).div(1e12);
        emit Withdraw(msg.sender, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // View function to see pending New on frontend.
    function pendingNew(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 accNew = accNewPerShare;
        uint256 lpSupply = lpToken.balanceOf(address(this));
        if (block.number > lastRewardBlock && lpSupply != 0) {
            uint256 newReward = getMultiplier(lastRewardBlock, block.number);
            accNew = accNew.add(newReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accNew).div(1e12).sub(user.rewardDebt);
    }

    receive () external payable { }
}
