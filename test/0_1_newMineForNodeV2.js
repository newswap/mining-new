const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const MockERC20 = artifacts.require('MockERC20');
const NewMineForNode = artifacts.require("NewMineForNodeV2");
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');

contract('NewMineForNodeV2', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        // const number = await time.latestBlock(); // string
        // console.log("number:"+ number)  
        // console.log("advanceBlockTo:"+ (parseInt(number)+10))
        // await time.advanceBlockTo(parseInt(number)+10);
        // const number2 = await time.latestBlock();
        // console.log("number2:"+ number2);
    });

    it('should set correct state variables', async () => {
        const wnew = "0xf4905b9bc02Ce21C98Eac1803693A9357D5253bf" // test/main
        const newPerBlock = web3.utils.toWei("10", 'ether');
        const number = await web3.eth.getBlockNumber();
        // const startBlock = number + 600; // 30分钟后开启
        const startBlock = number+10; 
        const oneYearBlock = 365*24*60*20; //挖一年
        this.newMine = await NewMineForNode.new(wnew, newPerBlock, startBlock, startBlock+oneYearBlock, dev,{from: alice});
        const getWNew = await this.newMine.wNew();
        const getNewPerBlock = await this.newMine.newPerBlock();
        const getLastRewardBlock = await this.newMine.lastRewardBlock();
        const getEndBlock = await this.newMine.endBlock();
        const newMineOwner = await this.newMine.owner();
        const maintainer = await this.newMine.maintainer(); 

        assert.equal(getWNew, wnew);
        assert.equal(getNewPerBlock.valueOf(), newPerBlock);
        assert.equal(getLastRewardBlock.valueOf(), startBlock);
        assert.equal(getEndBlock.valueOf(), startBlock+oneYearBlock);
        assert.equal(newMineOwner, alice);
        assert.equal(maintainer, dev);
    });

    it('should allow owner and only owner to setMaintainer', async () => {     
        await expectRevert(this.newMine.setMaintainer(bob, {from: dev}),'Ownable: caller is not the owner');
        await this.newMine.setMaintainer(bob, {from: alice});

        const maintainer = await this.newMine.maintainer(); 
        assert.equal(maintainer, bob);
    })
  
    it('should allow owner and only owner to emergencyWithdrawNew', async () => {   
        await this.newMine.send(web3.utils.toWei('5', 'ether'), {from: alice})
        assert.equal((await web3.eth.getBalance(this.newMine.address))/1e18, '5');

        const balance = await web3.eth.getBalance(carol);
        await expectRevert(this.newMine.emergencyWithdrawNew(carol, {from: dev}),'Ownable: caller is not the owner');
        await this.newMine.emergencyWithdrawNew(carol, {from: alice});

        const balance2 = await web3.eth.getBalance(carol);
        assert.equal((await web3.eth.getBalance(this.newMine.address)).valueOf(), 0);
        assert.equal((balance2-balance)/1e18, 5);
    })
  
    it('should allow owner and only owner to activate', async () => {
        const number = await web3.eth.getBlockNumber();
        const endBlock = number + 2*365*24*60*20; //挖2年   
        const newPerBlock = web3.utils.toWei("1", 'ether');
        await expectRevert(this.newMine.activate(endBlock, newPerBlock, true, {from: bob}),'Ownable: caller is not the owner');
        await this.newMine.activate(endBlock, newPerBlock, true, {from: alice});
        const getNewPerBlock = await this.newMine.newPerBlock();
        const getEndBlock = await this.newMine.endBlock();
        assert.equal(getNewPerBlock.valueOf(), newPerBlock);
        assert.equal(getEndBlock.valueOf(), endBlock);
    })

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.factory = await UniswapV2Factory.new(dev, { from: minter });
            this.wnew = await MockERC20.new('WNEW', 'WNEW', '100000000', { from: minter });
            this.token1 = await MockERC20.new('TOKEN1', 'TOKEN', '100000000', { from: minter });
            this.token2 = await MockERC20.new('TOKEN2', 'TOKEN2', '100000000', { from: minter });
            this.wnewToken1 = await UniswapV2Pair.at((await this.factory.createPair(this.wnew.address, this.token1.address)).logs[0].args.pair);
            this.wnewToken2 = await UniswapV2Pair.at((await this.factory.createPair(this.wnew.address, this.token2.address)).logs[0].args.pair);

            await this.wnew.transfer(this.wnewToken1.address, '10000000', { from: minter });
            await this.token1.transfer(this.wnewToken1.address, '10000000', { from: minter });
            await this.wnewToken1.mint(minter);
            const totalSupply1 = await this.wnewToken1.totalSupply();
            assert.equal(totalSupply1.valueOf(), 10000000);
            const balanceOf1 = await this.wnewToken1.balanceOf(minter);
            assert.equal(balanceOf1.valueOf(), 10000000-1000);

            await this.wnew.transfer(this.wnewToken2.address, '10000000', { from: minter });
            await this.token2.transfer(this.wnewToken2.address, '10000000', { from: minter });
            await this.wnewToken2.mint(minter);
            const totalSupply2 = await this.wnewToken2.totalSupply();
            assert.equal(totalSupply2.valueOf(), 10000000);
            const balanceOf2 = await this.wnewToken2.balanceOf(minter);
            assert.equal(balanceOf2.valueOf(), 10000000-1000);

            await this.wnewToken1.transfer(alice, '1000', { from: minter });
            await this.wnewToken1.transfer(bob, '1000', { from: minter });
            await this.wnewToken1.transfer(carol, '1000', { from: minter });
            await this.wnewToken2.transfer(alice, '1000', { from: minter });
            await this.wnewToken2.transfer(bob, '1000', { from: minter });
            await this.wnewToken2.transfer(carol, '1000', { from: minter });
        });
 
        it('should allow maintainer and only maintainer to addPool', async () => {
            const number = await web3.eth.getBlockNumber()
            const startBlock = number+10;
            // 1000 per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, '1000', startBlock, startBlock+1000, dev, {from: alice});            
            await expectRevert(this.newMine.addPool(this.wnewToken1.address, {from: alice}),'onlyMaintainer: caller is not the maintainer');
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
            assert.equal((await this.newMine.poolLength()).valueOf(), 1);
            var pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpToken, this.wnewToken1.address);
            assert.equal(pool.state, true);
            assert.equal(pool.lpAmount, 0);
            assert.equal(pool.newPerLP/1e12, 1);
            assert.equal(pool.rewardDebt, 0);
            assert.equal(pool.accNewPerShare, 0);

            await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
            await this.newMine.deposit(0, '100', { from: bob });
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '900');
            pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpAmount, 100);
            assert.equal((await this.newMine.stakingNewSupply()).valueOf(), 100);
            
            await expectRevert(this.newMine.setPoolState(0, false, {from: alice}),'onlyMaintainer: caller is not the maintainer');
            await this.newMine.setPoolState(0, false, {from: dev});
            var pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpAmount, 100);
            assert.equal(pool.state, false);
            assert.equal((await this.newMine.stakingNewSupply()).valueOf(), 0);
        })

        it('should allow emergency withdraw', async () => {
            const startBlock = (await web3.eth.getBlockNumber()) + 100;
            // 1000 per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, '1000', startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
            assert.equal((await this.newMine.poolLength()).valueOf(), 1);
            var pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpToken, this.wnewToken1.address);
            assert.equal(pool.state, true);
            assert.equal(pool.lpAmount, 0);
            assert.equal(pool.newPerLP/1e12, 1);
            assert.equal(pool.rewardDebt, 0);
            assert.equal(pool.accNewPerShare, 0);

            await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
            await this.newMine.deposit(0, '100', { from: bob });
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '900');
            pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpAmount, 100);
            assert.equal((await this.newMine.stakingNewSupply()).valueOf(), 100);
            
            await this.newMine.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '1000');
            pool = await this.newMine.poolInfo(0);
            assert.equal(pool.lpAmount, 0);
            assert.equal((await this.newMine.stakingNewSupply()).valueOf(), 0);
        });

        it('should give out News only after farming time', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number + 100;
            // 1 per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, web3.utils.toWei('1', 'ether'), startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.send(web3.utils.toWei('5', 'ether'), {from: alice})
            assert.equal(await web3.eth.getBalance(this.newMine.address), web3.utils.toWei('5', 'ether'));

            // // add pool
            await expectRevert(this.newMine.addPool(this.wnewToken1.address, {from: alice}),'onlyMaintainer: caller is not the maintainer');
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
            await this.newMine.deposit(0, '100', { from: bob });
            const balance = parseInt(await web3.eth.getBalance(bob)/1e18);
            await time.advanceBlockTo(number+89);
            await this.newMine.deposit(0, '0', { from: bob }); // Harvest   block number+90
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-balance, 0);
            await time.advanceBlockTo(number+94);
            await this.newMine.deposit(0, '0', { from: bob }); // block number+95
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-balance, 0);
            await time.advanceBlockTo(number+99);
            await this.newMine.deposit(0, '0', { from: bob }); // block number+100
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-balance, 0);
            await time.advanceBlockTo(number+100);
            await this.newMine.deposit(0, '0', { from: bob }); // block number+101
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-balance, 1);
            await time.advanceBlockTo(number+104);
            await this.newMine.deposit(0, '0', { from: bob }); // block 105
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-balance, 5);
            assert.equal(await web3.eth.getBalance(this.newMine.address)/1e18, 0);
        });

        it('should not distribute News if no one deposit', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number + 100;
            // 1 per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, web3.utils.toWei('1', 'ether'), startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.send(web3.utils.toWei('10', 'ether'), {from: alice})
            const newMineBalance = 10
            assert.equal((await web3.eth.getBalance(this.newMine.address))/1e18, newMineBalance);

            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
            await time.advanceBlockTo(number+99);
            assert.equal(parseInt(await web3.eth.getBalance(this.newMine.address)/1e18)-newMineBalance, '0');
            await time.advanceBlockTo(number+104);
            assert.equal(parseInt(await web3.eth.getBalance(this.newMine.address)/1e18)-newMineBalance, '0');
            await time.advanceBlockTo(number+109);
            const bobBalance = parseInt(await web3.eth.getBalance(bob)/1e18);
            await this.newMine.deposit(0, '10', { from: bob }); // block 110
            assert.equal(parseInt(await web3.eth.getBalance(this.newMine.address)/1e18)-newMineBalance, '0');
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-bobBalance, '0');
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '990');
            await time.advanceBlockTo(number+119);
            await this.newMine.withdraw(0, '9', { from: bob }); // block 120
            assert.equal(await web3.eth.getBalance(this.newMine.address)/1e18, 0);
            assert.equal(parseInt(await web3.eth.getBalance(bob)/1e18)-bobBalance, 10);
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '999');

            await expectRevert(this.newMine.deposit(0, '0', { from: bob }),'Address: insufficient balance'); //block 121
        });

        it('should distribute News properly for each staker', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number + 100;
            // 0.1 new per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, web3.utils.toWei('0.1', 'ether'), startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.send(web3.utils.toWei('5', 'ether'), {from: minter})
            const newMineBalance = web3.utils.toWei('5', 'ether')    
            assert.equal((await web3.eth.getBalance(this.newMine.address)).valueOf(), newMineBalance);
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
           
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: alice });
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: carol });
            // Alice deposits 10 wnewToken1 at block number+110
            await time.advanceBlockTo(number+109);
            await this.newMine.deposit(0, '10', { from: alice }); // number+110
            const aliceBalance = parseInt((await web3.eth.getBalance(alice)));
            // Bob deposits 20 wnewToken1 at block number+114
            await time.advanceBlockTo(number+113);
            await this.newMine.deposit(0, '20', { from: bob }); // number+114
            const bobBalance = parseInt((await web3.eth.getBalance(bob)));
            // Carol deposits 30 LPs at block number+118
            await time.advanceBlockTo(number+117);
            await this.newMine.deposit(0, '30', { from: carol }); // number+118
            const carolBalance = parseInt((await web3.eth.getBalance(carol)));
            // Alice deposits 10 more LPs at block number+120. At this point:
            //   Alice should have: 4*0.1 + 4*1/3*0.1 + 2*1/6*0.1 = 0.5666666666666666
            //   MasterChef should have the remaining: 5 - 0.5666666666666666 = 4.433333333333333
            await time.advanceBlockTo(number+119)
            const aliceTX = await this.newMine.deposit(0, '10', { from: alice }); // number+120
            // var receipt = await web3.eth.getTransaction(aliceTX.tx);
            // console.log(receipt)
            // console.log(aliceTX.receipt.gasUsed)
            var aliceTXUsed = parseInt(aliceTX.receipt.gasUsed) * 20000000000;
            assert.equal((await this.newMine.newSupply())/1e18, '1');        
            assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 0.5667);
            assert.equal(parseInt(await web3.eth.getBalance(bob))-bobBalance, '0');
            assert.equal(parseInt(await web3.eth.getBalance(carol))-carolBalance, '0');
            assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 0.5667);

            // Bob withdraws 5 LPs at block number+130. At this point:
            //   Bob should have: 4*2/3*0.1 + 2*2/6*0.1 + 10*2/7*0.1 = 0.6190476190476191
            await time.advanceBlockTo(number+129)
            const bobTX = await this.newMine.withdraw(0, '5', { from: bob });
            // console.log(bobTX.receipt.gasUsed)
            var bobTXUsed = parseInt(bobTX.receipt.gasUsed) * 20000000000;
            assert.equal((await this.newMine.newSupply())/1e18,'2');     
            assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 0.5667);
            assert.equal(((parseInt(await web3.eth.getBalance(bob))+bobTXUsed-bobBalance)/1e18).toFixed(4), 0.619);
            assert.equal(parseInt(await web3.eth.getBalance(carol))-carolBalance, '0');
            assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 0.5667+0.619);  
            
            // Alice withdraws 20 LPs at block number+140.
            // Bob withdraws 15 LPs at block number+150.
            // Carol withdraws 30 LPs at block number+160.
            await time.advanceBlockTo(number+139)
            const aliceTX2 = await this.newMine.withdraw(0, '20', { from: alice });
            aliceTXUsed = parseInt(aliceTX2.receipt.gasUsed) * 20000000000 + aliceTXUsed;
            await time.advanceBlockTo(number+149)
            const bobTX2 = await this.newMine.withdraw(0, '15', { from: bob });
            bobTXUsed = parseInt(bobTX2.receipt.gasUsed) * 20000000000 + bobTXUsed;
            await time.advanceBlockTo(number+159)
            const carolTX = await this.newMine.withdraw(0, '30', { from: carol });
            var carolTXUsed = parseInt(carolTX.receipt.gasUsed) * 20000000000;
            assert.equal((await this.newMine.newSupply())/1e18,'5');        
            // Alice should have: 0.5666666666666666 + 10*2/7*0.1 + 10*2/6.5*0.1 = 1.1600732600732602
            assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 1.1601);
            // Bob should have: 0.6190476190476191 + 10*1.5/6.5 * 0.1 + 10*1.5/4.5*0.1 = 1.1831501831501832
            assert.equal(((parseInt(await web3.eth.getBalance(bob))+bobTXUsed-bobBalance)/1e18).toFixed(4), 1.1832);
            // Carol should have: 2*3/6*0.1 + 10*3/7*0.1 + 10*3/6.5*0.1 + 10*3/4.5*0.1 + 10*0.1 = 2.656776556776557
            assert.equal(((parseInt(await web3.eth.getBalance(carol))+carolTXUsed-carolBalance)/1e18).toFixed(4), 2.6568);
            assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 5);

            // All of them should have 1000 LPs back.
            assert.equal((await this.wnewToken1.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '1000');
            assert.equal((await this.wnewToken1.balanceOf(carol)).valueOf(), '1000');
        });

        it('should not distribute News if pool state false', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number+10;
            // 0.1 new per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, web3.utils.toWei('0.1', 'ether'), startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.send(web3.utils.toWei('5', 'ether'), {from: minter})
            const newMineBalance = web3.utils.toWei('5', 'ether')    
            assert.equal((await web3.eth.getBalance(this.newMine.address)).valueOf(), newMineBalance);
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
           
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: alice });
            // Alice deposits 10 LPs at block number+ 90
            await time.advanceBlockTo(number + 89);
            await this.newMine.deposit(0, '10', { from: alice });
            const aliceBalance = parseInt((await web3.eth.getBalance(alice)));

            // At block number+100, set pool state to false,she should have 10*0.1 = 1 pending.
            await time.advanceBlockTo(number + 98);
            await expectRevert(this.newMine.setPoolState(0, false, {from: alice}),'onlyMaintainer: caller is not the maintainer');
            await this.newMine.setPoolState(0, false, {from: dev});
            assert.equal((await this.newMine.pendingNew(0, alice))/1e18, '1');
            await time.advanceBlockTo(number + 110);
            assert.equal((await this.newMine.pendingNew(0, alice))/1e18, '1');
            // At block number+120, set pool state to true
            await time.advanceBlockTo(number + 118);
            await expectRevert(this.newMine.setPoolState(0, false, {from: dev}),'setPoolState: state is not changed');
            await this.newMine.setPoolState(0, true, {from: dev});
            // At block number+125, she should have 1 + 5*0.1 = 1.5 pending.
            await time.advanceBlockTo(number + 125);
            assert.equal((await this.newMine.pendingNew(0, alice))/1e18, '1.5');
        });

        it('should stop giving bonus News after the period ends', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number + 100;
            const endBlock = number + 200;
            // 0.1 new per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, web3.utils.toWei('0.1', 'ether'), startBlock, endBlock, dev, {from: alice});
            await this.newMine.send(web3.utils.toWei('5', 'ether'), {from: minter})
            const newMineBalance = web3.utils.toWei('5', 'ether')    
            assert.equal((await web3.eth.getBalance(this.newMine.address)).valueOf(), newMineBalance);
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
           
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: alice });
            // Alice deposits 10 LPs at block number+ 190
            await time.advanceBlockTo(number + 189);
            await this.newMine.deposit(0, '10', { from: alice });
            const aliceBalance = parseInt((await web3.eth.getBalance(alice)));
            // At block number+205, she should have 10*0.1 = 1 pending.
            await time.advanceBlockTo(number + 205);
            assert.equal((await this.newMine.pendingNew(0, alice))/1e18, '1');
            // At block number+206, Alice withdraws all pending rewards and should get 1.
            const aliceTX = await this.newMine.deposit(0, '0', { from: alice });
            var aliceTXUsed = parseInt(aliceTX.receipt.gasUsed) * 20000000000;
            assert.equal((await this.newMine.newSupply())/1e18, '1');       
            console.log(Number(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)
            assert.equal(parseInt((Number(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18), '1');
            assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18), 1);

            await this.newMine.withdraw(0, '9', { from: alice });
            assert.equal((await this.wnewToken1.balanceOf(alice)).valueOf(), '999');
            assert.equal((await this.newMine.pendingNew(0, alice)).valueOf(), '0');
            assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18), 1);

            await time.advanceBlockTo(number + 219);
            // activiate pool at number + 220
            await this.newMine.activate(number + 500, web3.utils.toWei('0.1', 'ether'), true, {from: alice}); 
            assert.equal((await this.newMine.pendingNew(0, alice)).valueOf(), '0');
            await time.advanceBlockTo(number + 230);
            assert.equal((await this.newMine.pendingNew(0, alice))/1e18, '1');
        });

        it('should give proper News allocation to each pool after updateNewPerLP', async () => {
            const number = await web3.eth.getBlockNumber();
            const startBlock = number + 100;
            // 1000 new per block farming rate starting at startBlock with bonus until block startBlock+1000
            this.newMine = await NewMineForNode.new(this.wnew.address, '1000', startBlock, startBlock+1000, dev, {from: alice});
            await this.newMine.addPool(this.wnewToken1.address, {from: dev});
            await this.newMine.addPool(this.wnewToken2.address, {from: dev});
            await this.wnewToken1.approve(this.newMine.address, '1000', { from: alice });
            await this.wnewToken2.approve(this.newMine.address, '1000', { from: bob });

            var wnewToken1Pool = await this.newMine.poolInfo(0);
            var wnewToken2Pool = await this.newMine.poolInfo(1);
            assert.equal(wnewToken1Pool.newPerLP/1e12, 1);
            assert.equal(wnewToken2Pool.newPerLP/1e12, 1);

            // Alice deposits 10 wnewToken1 at block number+110
            await time.advanceBlockTo(number+109);
            await this.newMine.deposit(0, '20', { from: alice }); // number+110
            // Bob deposits 20 wnewToken1 at block number+114
            await time.advanceBlockTo(number+113);
            await this.newMine.deposit(1, '10', { from: bob }); // number+114

            // Fake some revenue
            await this.wnew.transfer(this.wnewToken2.address, '10000000', { from: minter });
            await this.token2.transfer(this.wnewToken2.address, '0', { from: minter });
            await this.wnewToken2.sync();
            const newPerLPPool1 = await this.newMine.getNewPerLP(wnewToken1Pool.lpToken);
            const newPerLPPool2 = await this.newMine.getNewPerLP(wnewToken2Pool.lpToken);
            assert.equal(newPerLPPool1/1e12, 1);
            assert.equal(newPerLPPool2/1e12, 2);

            await time.advanceBlockTo(number+120);
            // Alice should have: 4*1000 + 6*2/3*1000 = 80000
            assert.equal((await this.newMine.pendingNew(0, alice)), '8000');
            // Bob should have: 6*1/3*1000 = 2000
            assert.equal((await this.newMine.pendingNew(1, bob)), '2000');
            
            // At block number+126, update LP token price against NEW
            await time.advanceBlockTo(number+125);
            await this.newMine.updateNewPerLPAll(); // number+126
            // Alice should have: 8000 + 6*2/3*1000 = 120000
            assert.equal((await this.newMine.pendingNew(0, alice)), '12000');
            // Bob should have: 20000 + 6*1/3*1000 = 4000
            assert.equal((await this.newMine.pendingNew(1, bob)), '4000');
            
            // At block number+136, use lastest LP token price
            await time.advanceBlockTo(number+136);
            // Alice should have: 12000 + 10*1/2*1000 = 170000
            assert.equal((await this.newMine.pendingNew(0, alice)), '17000');
            // Bob should have: 4000 + 10*1/2*1000 = 9000
            assert.equal((await this.newMine.pendingNew(1, bob)), '9000');
        });
    });
});