const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const MockERC20 = artifacts.require('MockERC20');
const NewMineForCommunity = artifacts.require("NewMineForCommunity");
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');

contract('NewMineForCommunity gas', ([alice, bob, carol, dev, minter]) => {
    // beforeEach(async () => {
    //     this.factory = await UniswapV2Factory.new(dev, { from: minter });
    //     this.wnew = await MockERC20.new('WNEW', 'WNEW', '100000000', { from: minter });
    //     this.token1 = await MockERC20.new('TOKEN1', 'TOKEN', '100000000', { from: minter });
    //     this.token2 = await MockERC20.new('TOKEN2', 'TOKEN2', '100000000', { from: minter });
    //     this.wnewToken1 = await UniswapV2Pair.at((await this.factory.createPair(this.wnew.address, this.token1.address)).logs[0].args.pair);
    //     this.wnewToken2 = await UniswapV2Pair.at((await this.factory.createPair(this.wnew.address, this.token2.address)).logs[0].args.pair);

    //     await this.wnew.transfer(this.wnewToken1.address, '10000000', { from: minter });
    //     await this.token1.transfer(this.wnewToken1.address, '10000000', { from: minter });
    //     await this.wnewToken1.mint(minter);
    //     const totalSupply1 = await this.wnewToken1.totalSupply();
    //     assert.equal(totalSupply1.valueOf(), 10000000);
    //     const balanceOf1 = await this.wnewToken1.balanceOf(minter);
    //     assert.equal(balanceOf1.valueOf(), 10000000-1000);

    //     await this.wnew.transfer(this.wnewToken2.address, '10000000', { from: minter });
    //     await this.token2.transfer(this.wnewToken2.address, '10000000', { from: minter });
    //     await this.wnewToken2.mint(minter);
    //     const totalSupply2 = await this.wnewToken2.totalSupply();
    //     assert.equal(totalSupply2.valueOf(), 10000000);
    //     const balanceOf2 = await this.wnewToken2.balanceOf(minter);
    //     assert.equal(balanceOf2.valueOf(), 10000000-1000);

    //     await this.wnewToken1.transfer(alice, '1000', { from: minter });
    //     await this.wnewToken1.transfer(bob, '1000', { from: minter });
    //     await this.wnewToken1.transfer(carol, '1000', { from: minter });
    //     await this.wnewToken2.transfer(alice, '1000', { from: minter });
    //     await this.wnewToken2.transfer(bob, '1000', { from: minter });
    //     await this.wnewToken2.transfer(carol, '1000', { from: minter });
    // });

    it('init pair', async () => {
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

    it('test add pool', async () => {
        const number = await web3.eth.getBlockNumber();
        const startBlock = number;
        // 1000wei per block farming rate starting at startBlock with bonus until block startBlock+1000
        this.newMine = await NewMineForCommunity.new(this.wnew.address, 1000, startBlock+1, startBlock+10000, dev, {from: alice});
        await this.newMine.send(web3.utils.toWei('1', 'ether'), {from: minter})
        const newMineBalance = web3.utils.toWei('1', 'ether')    
        assert.equal((await web3.eth.getBalance(this.newMine.address)).valueOf(), newMineBalance);
        
        // pid 0
        await this.newMine.addPool(this.wnewToken1.address, {from: dev});

        // 添加一批池子
        await this.wnewToken2.approve(this.newMine.address, '1000', { from: alice });
        for(i=1;i<10;i++){
            await this.newMine.addPool(this.wnewToken2.address, {from: dev});
            var temp = await this.newMine.deposit(i, '1', { from: alice });
            console.log(i + "for deposit:"+parseInt(temp.receipt.gasUsed))
        }
        var temp = await this.newMine.deposit(1, '1', { from: alice });
        console.log("for deposit:"+parseInt(temp.receipt.gasUsed));
        temp = await this.newMine.withdraw(1, '2', { from: alice });
        console.log("for withdraw:"+parseInt(temp.receipt.gasUsed));
        var temp = await this.newMine.deposit(1, '1', { from: alice });
        console.log("for deposit:"+parseInt(temp.receipt.gasUsed));

        console.log("poollength:"+await this.newMine.poolLength())
    });

    it('show used gas for deposit and withdraw', async () => {
        const number = await web3.eth.getBlockNumber();

        await this.wnewToken1.approve(this.newMine.address, '1000', { from: alice });
        await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
        await this.wnewToken1.approve(this.newMine.address, '1000', { from: carol });
        // Alice deposits 10 wnewToken1 at block number+110
        await time.advanceBlockTo(number+109);
        var temp = await this.newMine.deposit(0, '10', { from: alice }); // number+110
        console.log("deposit:"+parseInt(temp.receipt.gasUsed))

        const aliceBalance = parseInt((await web3.eth.getBalance(alice)));
        // Bob deposits 20 wnewToken1 at block number+114
        await time.advanceBlockTo(number+113);
        temp = await this.newMine.deposit(0, '20', { from: bob }); // number+114
        console.log("deposit:"+parseInt(temp.receipt.gasUsed))

        const bobBalance = parseInt((await web3.eth.getBalance(bob)));
        // Carol deposits 30 LPs at block number+118
        await time.advanceBlockTo(number+117);
        temp = await this.newMine.deposit(0, '30', { from: carol }); // number+118
        console.log("deposit:"+parseInt(temp.receipt.gasUsed))

        const carolBalance = parseInt((await web3.eth.getBalance(carol)));
        // Alice deposits 10 more LPs at block number+120. At this point:
        //   Alice should have: 4*0.1 + 4*1/3*0.1 + 2*1/6*0.1 = 0.5666666666666666
        //   MasterChef should have the remaining: 5 - 0.5666666666666666 = 4.433333333333333
        await time.advanceBlockTo(number+119)
        const aliceTX = await this.newMine.deposit(0, '10', { from: alice }); // number+120
        // var receipt = await web3.eth.getTransaction(aliceTX.tx);
        // console.log(receipt)
        var aliceTXUsed = parseInt(aliceTX.receipt.gasUsed) * 20000000000;
        console.log(aliceTX.receipt.gasUsed)
        console.log("aliceTXUsed deposit="+aliceTXUsed/1e18)

        // assert.equal((await this.newMine.newSupply())/1e18, '1');        
        // assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 0.5667);
        // assert.equal(parseInt(await web3.eth.getBalance(bob))-bobBalance, '0');
        // assert.equal(parseInt(await web3.eth.getBalance(carol))-carolBalance, '0');
        // assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 0.5667);

        // Bob withdraws 5 LPs at block number+130. At this point:
        //   Bob should have: 4*2/3*0.1 + 2*2/6*0.1 + 10*2/7*0.1 = 0.6190476190476191
        await time.advanceBlockTo(number+129)
        const bobTX = await this.newMine.withdraw(0, '5', { from: bob });
        var bobTXUsed = parseInt(bobTX.receipt.gasUsed) * 20000000000;
        console.log(bobTX.receipt.gasUsed)
        console.log("bobTXUsed withdraw="+bobTXUsed/1e18)

        // assert.equal((await this.newMine.newSupply())/1e18,'2');     
        // assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 0.5667);
        // assert.equal(((parseInt(await web3.eth.getBalance(bob))+bobTXUsed-bobBalance)/1e18).toFixed(4), 0.619);
        // assert.equal(parseInt(await web3.eth.getBalance(carol))-carolBalance, '0');
        // assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 0.5667+0.619);  
        
        // Alice withdraws 20 LPs at block number+140.
        // Bob withdraws 15 LPs at block number+150.
        // Carol withdraws 30 LPs at block number+160.
        await time.advanceBlockTo(number+139)
        const aliceTX2 = await this.newMine.withdraw(0, '10', { from: alice });
        aliceTXUsed = parseInt(aliceTX2.receipt.gasUsed) * 20000000000 + aliceTXUsed;
        console.log(aliceTX2.receipt.gasUsed)
        console.log("aliceTX2 withdraw="+aliceTXUsed/1e18)

        await time.advanceBlockTo(number+149)
        const bobTX2 = await this.newMine.withdraw(0, '5', { from: bob });
        console.log("withdraw"+bobTX2.receipt.gasUsed)

        bobTXUsed = parseInt(bobTX2.receipt.gasUsed) * 20000000000 + bobTXUsed;
        await time.advanceBlockTo(number+159)
        const carolTX = await this.newMine.withdraw(0, '20', { from: carol });
        console.log("withdraw"+carolTX.receipt.gasUsed)

        // var carolTXUsed = parseInt(carolTX.receipt.gasUsed) * 20000000000;
        // assert.equal((await this.newMine.newSupply())/1e18,'5');        
        // // Alice should have: 0.5666666666666666 + 10*2/7*0.1 + 10*2/6.5*0.1 = 1.1600732600732602
        // assert.equal(((parseInt(await web3.eth.getBalance(alice))+aliceTXUsed-aliceBalance)/1e18).toFixed(4), 1.1601);
        // // Bob should have: 0.6190476190476191 + 10*1.5/6.5 * 0.1 + 10*1.5/4.5*0.1 = 1.1831501831501832
        // assert.equal(((parseInt(await web3.eth.getBalance(bob))+bobTXUsed-bobBalance)/1e18).toFixed(4), 1.1832);
        // // Carol should have: 2*3/6*0.1 + 10*3/7*0.1 + 10*3/6.5*0.1 + 10*3/4.5*0.1 + 10*0.1 = 2.656776556776557
        // assert.equal(((parseInt(await web3.eth.getBalance(carol))+carolTXUsed-carolBalance)/1e18).toFixed(4), 2.6568);
        // assert.equal(((newMineBalance - parseInt((await web3.eth.getBalance(this.newMine.address))))/1e18).toFixed(4), 5);

        // All of them should have 1000 LPs back.
        // assert.equal((await this.wnewToken1.balanceOf(alice)).valueOf(), '1000');
        // assert.equal((await this.wnewToken1.balanceOf(bob)).valueOf(), '1000');
        // assert.equal((await this.wnewToken1.balanceOf(carol)).valueOf(), '1000');
    });

    it('show used gas for updatePool', async () => {
        const number = await web3.eth.getBlockNumber();
        await time.advanceBlockTo(number+10)

        var temp = await this.newMine.updatePool(0); 
        console.log("0 updatePool:"+parseInt(temp.receipt.gasUsed))

        if(parseInt(await this.newMine.poolLength()) > 1) {
            temp = await this.newMine.updatePool(1); 
            console.log("1 updatePool:"+parseInt(temp.receipt.gasUsed))
        }
    });
    
    it('show used gas for updateNewPerLP', async () => {
        const number = await web3.eth.getBlockNumber();
        await time.advanceBlockTo(number+10)

        var temp = await this.newMine.updateNewPerLP(0); 
        console.log("0 updateNewPerLP:"+parseInt(temp.receipt.gasUsed))

        if(parseInt(await this.newMine.poolLength()) > 1) {
            temp = await this.newMine.updateNewPerLP(1); 
            console.log("1 updateNewPerLP:"+parseInt(temp.receipt.gasUsed))
        }
    });

    it('show used gas for setPoolState', async () => {
        const number = await web3.eth.getBlockNumber();
        await time.advanceBlockTo(number+10)

        var temp = await this.newMine.setPoolState(0, false, {from: dev}); 
        console.log("0 setPoolState false:"+parseInt(temp.receipt.gasUsed))
        temp = await this.newMine.setPoolState(0, true, {from: dev}); 
        console.log("0 setPoolState true:"+parseInt(temp.receipt.gasUsed))
        
        if(parseInt(await this.newMine.poolLength()) > 1) {
            var temp = await this.newMine.setPoolState(1, false, {from: dev}); 
            console.log("1 setPoolState false:"+parseInt(temp.receipt.gasUsed))
            temp = await this.newMine.setPoolState(1, true, {from: dev}); 
            console.log("1 setPoolState true:"+parseInt(temp.receipt.gasUsed))   
        }
    });

    it('show used gas for activate', async () => {
        const number = await web3.eth.getBlockNumber();

        var temp = await this.newMine.activate(number+10000, 100, true); 
        console.log("activate:"+parseInt(temp.receipt.gasUsed))
    });

});
