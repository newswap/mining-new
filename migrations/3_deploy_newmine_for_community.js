const NewMineForCommunity = artifacts.require("NewMineForCommunity");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")

module.exports = async function (deployer, network, accounts) {
  console.log("accounts[0]:"+accounts[0]);

  const wnew = "0xf4905b9bc02ce21c98eac1803693a9357d5253bf" // test/main
  const maintainer = accounts[0]
  const newPerBlock = web3.utils.toWei("49.603174", 'ether');
  const number = await web3.eth.getBlockNumber();
  // const startBlock = number + 20; // 60s后
  const startBlock = 22719023; //测试网 2021-02-19 08:00:00
  const oneMonthBlock = 27*24*60*20; //挖27天 2021-03-18 08:00:00
  // _wNew, _newPerBlock, _startBlock, _endBlock, _maintainer
  await deployer.deploy(NewMineForCommunity, wnew, newPerBlock, startBlock, startBlock+oneMonthBlock, maintainer);
  const newMine = await NewMineForCommunity.deployed();
  console.log("newMine:" + newMine.address);

  // // // 添加IMX_NEW矿池 id=0
  const IMX_NEW = '0xbba2d33e853737f5cbe3f8834d31bb406d0d5798' //TESTNET
  await newMine.addPool(IMX_NEW, {from: maintainer});
  var pool = await newMine.poolInfo(0);
  console.log(pool.lpToken)  
  console.log(pool.state)
  console.log(Number(pool.lpAmount))
  console.log(Number(pool.newPerLP))
  console.log(Number(pool.rewardDebt))
  console.log(Number(pool.accNewPerShare))

  var pair = await IUniswapV2Pair.at(IMX_NEW)
  // console.log(Number(await pair.totalSupply()))
  // console.log(await pair.token1()) // wnew
  var reserves = await pair.getReserves()
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())))
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  // 添加MCT_NEW矿池 id=1
  const MCT_NEW = '0xe3715753795fb99c68857a6b7f5c3e6ccae4ec78' //TESTNET
  await newMine.addPool(MCT_NEW, {from: maintainer});
  var pool = await newMine.poolInfo(1);
  console.log(pool.lpToken)  
  console.log(pool.state)
  console.log(Number(pool.lpAmount))
  console.log(Number(pool.newPerLP))
  console.log(Number(pool.rewardDebt))
  console.log(Number(pool.accNewPerShare))

  var pair = await IUniswapV2Pair.at(MCT_NEW)
  // console.log(await pair.token1()) // wnew
  var reserves = await pair.getReserves()
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())))
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  // TODO 给newMine 转NEW
  // testnet  newMine: 0xF313C8852762ae2E856D849E4130Ff50F45fe683
  // 第一个池子IMX_NEW： '0xbba2d33e853737f5cbe3f8834d31bb406d0d5798'
  // 第二个池子MCT_NEW： '0xe3715753795fb99c68857a6b7f5c3e6ccae4ec78'



  // 激活矿池
  // const newMine = await NewMineForCommunity.at("");
  // const newPerBlock = web3.utils.toWei("1", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // console.log(number)
  // const endBlock = number+1+600  //再挖30分钟
  // var tx = await newMine.activate(endBlock, newPerBlock, true)
  // console.log(tx)


  // 紧急提现
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x8c7B5cb8fa4Fc0b945ec9ac6d2FAbAC571ad4210')/1e18)
  // const newMine = await NewMineForCommunity.at("0x8c7B5cb8fa4Fc0b945ec9ac6d2FAbAC571ad4210");
  // await newMine.emergencyWithdrawNew(accounts[0])
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x8c7B5cb8fa4Fc0b945ec9ac6d2FAbAC571ad4210')/1e18)



};

