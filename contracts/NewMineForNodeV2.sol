// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import './uniswapv2/interfaces/IUniswapV2Pair.sol';

// NewMineForNodeV2 is the master of NewFarm. He can distribute New and he is a fair guy.
contract NewMineForNodeV2 is Ownable {
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
        //   pending reward = (user.amount * pool.accNewPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The `accNewPerShare` 、`stakingNewSupply ` and `lastRewardBlock` gets updated.
        //   2. The pool's lpAmount、rewardDebt、accNewPerShare gets updated.
        //   3. User receives the pending reward sent to his/her address.
        //   4. User's `amount` gets updated.
        //   5. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken;      // Address of LP token contract.
        bool state;          // true-enable, false-disable

        // lpAmount*newPerLP = newAmount
        uint256 lpAmount; 
        uint256 newPerLP; // LP token price against NEW, times 1e12  
        uint256 rewardDebt;
        uint256 accNewPerShare; // Accumulated new per share, times 1e12. 
        
        // pending reward = (pool.lpAmount.mul(pool.newPerLP) * accNewPerShare) - pool.rewardDebt
        // pool.accNewPerShare +=  pending/pool.lpAmount   
    }

    // ∑(LP token amount * LP token price against NEW)
    uint256 public stakingNewSupply = 0;
    // Last block number that New distribution occurs.
    uint256 public lastRewardBlock;
    // Accumulated NEW per share, times 1e12. 
    uint256 public accNewPerShare;

    address public maintainer;
    address public wNew;
    uint256 public newSupply;

    // new tokens created per block.
    uint256 public newPerBlock;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    // The block number when New mining finish.
    uint256 public endBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        address _wNew,
        uint256 _newPerBlock,
        uint256 _startBlock,
        uint256 _endBlock,
        address _maintainer
    ) public {
        require(_startBlock >= block.number, 'Deploy: genesis too soon');
        require(_endBlock > _startBlock, 'Deploy: endBlock must be greater than startBlock');

        wNew = _wNew;
        newPerBlock = _newPerBlock;
        lastRewardBlock = _startBlock;
        endBlock = _endBlock;
        maintainer = _maintainer;
    }

    modifier onlyMaintainer() {
        require(maintainer == msg.sender, "onlyMaintainer: caller is not the maintainer");
        _;
    }

    ///////////////////////////////////////////////////
    //            function for Owner                 //
    ///////////////////////////////////////////////////
    
    function setMaintainer(address _maintainer) public onlyOwner {
        maintainer = _maintainer;   
    }

    // Withdraw New. EMERGENCY ONLY.
    function emergencyWithdrawNew(address payable _to) public onlyOwner {
        Address.sendValue(_to, address(this).balance);
    }

    event Activated(uint256 _endBlock, uint256 _newPerBlock);
    // activate all pool after stop mining
    function activate(uint256 _endBlock, uint256 _newPerBlock, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }

        endBlock = _endBlock;
        newPerBlock = _newPerBlock;

        emit Activated(_endBlock, _newPerBlock);
    }

    ///////////////////////////////////////////////////
    //       function for Maintainer                 //
    ///////////////////////////////////////////////////
    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function addPool(IERC20 _lpToken) public onlyMaintainer {
        uint256 newPerLP = getNewPerLP(address(_lpToken));

        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            state: true,
            lpAmount: 0,
            newPerLP: newPerLP,
            rewardDebt: 0,
            accNewPerShare: 0
        }));
    }

    function setPoolState(uint256 _pid, bool _state) public onlyMaintainer {
        updatePool(_pid);
        
        PoolInfo storage pool = poolInfo[_pid];
        require(pool.state != _state, "setPoolState: state is not changed");
        pool.state = _state;

        if(_state) { //enable
            pool.newPerLP = getNewPerLP(address(pool.lpToken));
            stakingNewSupply = stakingNewSupply.add(pool.lpAmount.mul(pool.newPerLP).div(1e12));     
            pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);
        } else { //disable
            stakingNewSupply = stakingNewSupply.sub(pool.lpAmount.mul(pool.newPerLP).div(1e12));     
        }
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];

        // update accNewPerShare
        if (block.number > lastRewardBlock) {
            if (stakingNewSupply != 0) {
                uint256 newReward = getMultiplier(lastRewardBlock, block.number);
                newSupply = newSupply.add(newReward);
                accNewPerShare = accNewPerShare.add(newReward.mul(1e12).div(stakingNewSupply));
            }

            lastRewardBlock = block.number;
        }

        if(!pool.state || pool.lpAmount == 0) {
            return;
        }

        // update pool.accNewPerShare
        uint256 pending = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24).sub(pool.rewardDebt);
        if(pending > 0) {
            pool.accNewPerShare = pool.accNewPerShare.add(pending.mul(1e12).div(pool.lpAmount));
            pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);
        }
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

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    ///////////////////////////////////////////////////
    //       function for Keeper                     //
    ///////////////////////////////////////////////////
    function updateNewPerLPAll() public {
        massUpdatePools();

        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            PoolInfo storage pool = poolInfo[pid];
            if(pool.state) {
                stakingNewSupply = stakingNewSupply.sub(pool.lpAmount.mul(pool.newPerLP).div(1e12));        
                pool.newPerLP = getNewPerLP(address(pool.lpToken));
                stakingNewSupply = stakingNewSupply.add(pool.lpAmount.mul(pool.newPerLP).div(1e12));   
                pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);
            }
        }
    }

    // update LP token price against NEW
    function updateNewPerLP(uint256 _pid) public {
        updatePool(_pid);

        PoolInfo storage pool = poolInfo[_pid];
        if(pool.state) {
            stakingNewSupply = stakingNewSupply.sub(pool.lpAmount.mul(pool.newPerLP).div(1e12));     
            pool.newPerLP = getNewPerLP(address(pool.lpToken));
            stakingNewSupply = stakingNewSupply.add(pool.lpAmount.mul(pool.newPerLP).div(1e12));     
            pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);
        }
    }

    // return LP token price against NEW, times 1e12 
    function getNewPerLP(address lpAddress) public view returns (uint256) {
        IUniswapV2Pair pair = IUniswapV2Pair(lpAddress);
        address token0 = pair.token0();
        address token1 = pair.token1();
        require(token0 == wNew || token1 == wNew, "getNewPerLP: lpToken doesn't include wnew");

        (uint reserve0, uint reserve1,) = pair.getReserves();
        uint256 lpTotalSupply = pair.totalSupply();
        if(lpTotalSupply > 0) {
            return token0 == wNew ? reserve0.mul(1e12).div(lpTotalSupply) : reserve1.mul(1e12).div(lpTotalSupply);
        } else {
            return 0;
        }     
    }

    ///////////////////////////////////////////////////
    //       function for Miner                      //
    ///////////////////////////////////////////////////

    // Deposit LP tokens to NewMine for NEW allocation.
    function deposit(uint256 _pid, uint256 _amount) public payable {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender]; 

        updateNewPerLP(_pid);

        // harvest new
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accNewPerShare).div(1e12).sub(user.rewardDebt);       
            if(pending > 0) {
                Address.sendValue(msg.sender, pending);
            }
        }

        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);           
            user.amount = user.amount.add(_amount);
            pool.lpAmount = pool.lpAmount.add(_amount);
            if(pool.state) {
                stakingNewSupply = stakingNewSupply.add(_amount.mul(pool.newPerLP).div(1e12));
            }            
        }

        user.rewardDebt = user.amount.mul(pool.accNewPerShare).div(1e12);
        pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);

        emit Deposit(msg.sender, _pid, _amount);        
    }

    // Withdraw LP tokens from NewMine.
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        updateNewPerLP(_pid);
        
        uint256 pending = user.amount.mul(pool.accNewPerShare).div(1e12).sub(user.rewardDebt);       
        if(pending > 0) {
            Address.sendValue(msg.sender, pending);
        }
   
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpAmount = pool.lpAmount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
            if(pool.state) {
                stakingNewSupply = stakingNewSupply.sub(_amount.mul(pool.newPerLP).div(1e12));
            }
        }

        user.rewardDebt = user.amount.mul(pool.accNewPerShare).div(1e12);
        pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);

        emit Deposit(msg.sender, _pid, _amount);        
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);

        if(pool.state) {
            stakingNewSupply = stakingNewSupply.sub(user.amount.mul(pool.newPerLP).div(1e12));
            
            // TODO 有点问题，如果 accNewPerShare很久没有更新了！！！那pool池子中的其他用户不就全部跟着倒霉了？？？？
            uint256 pending = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24).sub(pool.rewardDebt);
            if(pending > 0) {
                pool.accNewPerShare = pool.accNewPerShare.add(pending.mul(1e12).div(pool.lpAmount));
            } 
        }

        pool.lpAmount = pool.lpAmount.sub(user.amount);
        pool.rewardDebt = pool.lpAmount.mul(pool.newPerLP).mul(accNewPerShare).div(1e24);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // View function to see pending New on frontend.
    function pendingNew(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
                
        // get lastest accNewPerShare
        uint256 _accNewPerShare = accNewPerShare;
        if (block.number > lastRewardBlock && stakingNewSupply != 0) {
            uint256 newReward = getMultiplier(lastRewardBlock, block.number);
            _accNewPerShare = _accNewPerShare.add(newReward.mul(1e12).div(stakingNewSupply));
        }
 
        // get lastest pool.accNewPerShare
        uint256 poolAccNewPerShare = pool.accNewPerShare;
        if(pool.state && pool.lpAmount != 0) {
            uint256 pending = pool.lpAmount.mul(pool.newPerLP).mul(_accNewPerShare).div(1e24).sub(pool.rewardDebt);
            if(pending > 0) {
                poolAccNewPerShare = poolAccNewPerShare.add(pending.mul(1e12).div(pool.lpAmount));
            }
        }

        return user.amount.mul(poolAccNewPerShare).div(1e12).sub(user.rewardDebt);
    }

    receive () external payable { }
}
