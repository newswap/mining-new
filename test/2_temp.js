const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const MockERC20 = artifacts.require('MockERC20');
const NewMine = artifacts.require("NewMine");
const NewMineSingle = artifacts.require("NewMineSingle");
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const UniswapV2Factory = artifacts.require('UniswapV2Factory');

contract('Temp', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.factory = await UniswapV2Factory.new(dev, { from: minter });
        this.wnew = await MockERC20.new('WNEW', 'WNEW', '100000000', { from: minter });
        this.token1 = await MockERC20.new('TOKEN1', 'TOKEN', '100000000', { from: minter });
        this.wnewToken1 = await UniswapV2Pair.at((await this.factory.createPair(this.wnew.address, this.token1.address)).logs[0].args.pair);

        await this.wnew.transfer(this.wnewToken1.address, '10000000', { from: minter });
        await this.token1.transfer(this.wnewToken1.address, '10000000', { from: minter });
        await this.wnewToken1.mint(minter);
        const totalSupply1 = await this.wnewToken1.totalSupply();
        assert.equal(totalSupply1.valueOf(), 10000000);
        const balanceOf1 = await this.wnewToken1.balanceOf(minter);
        assert.equal(balanceOf1.valueOf(), 10000000-1000);

        await this.wnewToken1.transfer(alice, '1000', { from: minter });
        await this.wnewToken1.transfer(bob, '1000', { from: minter });
        await this.wnewToken1.transfer(carol, '1000', { from: minter });
    });

    it('should set correct state variables', async () => {
        const number = await web3.eth.getBlockNumber();
        const startBlock = number + 100;
        // 1 per block farming rate starting at startBlock with bonus until block startBlock+1000
        this.newMine = await NewMine.new(this.wnew.address, web3.utils.toWei('0.01', 'ether'), startBlock, startBlock+1000, dev, {from: alice});
        await this.newMine.send(web3.utils.toWei('1', 'ether'), {from: alice})
        const newMineBalance = 1
        assert.equal((await web3.eth.getBalance(this.newMine.address))/1e18, newMineBalance);

        await this.newMine.addPool(this.wnewToken1.address, {from: dev});
        await this.wnewToken1.approve(this.newMine.address, '1000', { from: bob });
        await time.advanceBlockTo(number+109);
        const bobBalance = parseInt(await web3.eth.getBalance(bob)/1e18);
        await this.newMine.deposit(0, '10', { from: bob }); // block 110

        await time.advanceBlockTo(number+119);
        const tx = await this.newMine.withdraw(0, '9', { from: bob }); // block 120
        console.log(tx.logs[0].args)

    });

  
});
