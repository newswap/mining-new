const NewMine = artifacts.require("NewMine");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")

module.exports = async function (deployer, network, accounts) {
  console.log("accounts[0]:"+accounts[0]);

  const wnew = "0xf4905b9bc02ce21c98eac1803693a9357d5253bf" // test/main
  const maintainer = accounts[1]
  const newPerBlock = web3.utils.toWei("1", 'ether');
  const number = await web3.eth.getBlockNumber();
  const startBlock = number + 200; // 10分钟后开启    
  const oneYearBlock = 365*24*60*20; //挖一年 
  // _wNew, _newPerBlock, _startBlock, _endBlock, _maintainer
  await deployer.deploy(NewMine, wnew, newPerBlock, startBlock, startBlock+oneYearBlock, maintainer);
  const newMine = await NewMine.deployed();
  console.log("newMine:" + newMine.address);

  // maintainer添加nusdt-new矿池  id=0
  const NUSDT_NEW = '0x56ae975581a382193ff36579c81281e179486c43' //TESTNET
  await newMine.addPool(NUSDT_NEW, {from: maintainer});
  var pool = await newMine.poolInfo(0);
  console.log(pool.lpToken)
  console.log(Number(pool.allocPoint))
  console.log(Number(pool.lastRewardBlock))
  console.log(Number(pool.accNewPerShare))
  console.log(Number(pool.newPerLP))
  console.log(pool.state)
  var pair = await IUniswapV2Pair.at(NUSDT_NEW)
  // console.log(Number(await pair.totalSupply()))
  // console.log(await pair.token1()) // wnew
  var reserves = await pair.getReserves()
  // console.log(Number(reserves.reserve1))
  console.log((Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  // 添加IMX_NEW矿池 id=1
  const IMX_NEW = '0xbba2d33e853737f5cbe3f8834d31bb406d0d5798' //TESTNET
  await newMine.addPool(IMX_NEW, {from: maintainer});
  var pool = await newMine.poolInfo(1);
  console.log(pool.lpToken)
  console.log(Number(pool.allocPoint))
  console.log(Number(pool.lastRewardBlock))
  console.log(Number(pool.accNewPerShare))
  console.log(Number(pool.newPerLP))
  console.log(pool.state)
  var pair = await IUniswapV2Pair.at(IMX_NEW)
  // console.log(Number(await pair.totalSupply()))
  // console.log(await pair.token1()) // wnew
  var reserves = await pair.getReserves()
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())))
  console.log(parseInt(Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  // 添加NBTC_NEW矿池 id=2
  const NBTC_NEW = '0xdda2c1d6237dab9351af93e1f3f81047f897e45b' //TESTNET
  await newMine.addPool(NBTC_NEW, {from: maintainer});
  var pool = await newMine.poolInfo(2);
  console.log(pool.lpToken)
  console.log(Number(pool.allocPoint))
  console.log(Number(pool.lastRewardBlock))
  console.log(Number(pool.accNewPerShare))
  console.log(Number(pool.newPerLP))
  console.log(pool.state)
  var pair = await IUniswapV2Pair.at(NBTC_NEW)
  // console.log(await pair.token1()) // wnew
  var reserves = await pair.getReserves()
  console.log((Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  // TODO 给newMine 转NEW

  // TestNET
  // newMine: 0x72dcd4dba487d8052e0aab77e3af9050d759e0a2
  // 第一个池子NUSDT_NEW： '0x56ae975581a382193ff36579c81281e179486c43'
  // 第二个池子IMX_NEW： '0xbba2d33e853737f5cbe3f8834d31bb406d0d5798'
  // 第三个池子NBTC_NEW： '0xdda2c1d6237dab9351af93e1f3f81047f897e45b'



  // 激活矿池
  // const newMine = await NewMine.at("");
  // const newPerBlock = web3.utils.toWei("1", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // console.log(number)
  // const endBlock = number+1+600  //再挖30分钟
  // var tx = await newMine.activate(endBlock, newPerBlock, true)
  // console.log(tx)


  // 紧急提现
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x665d01B3757d530dC136942b94B16b27bf1d1c8b')/1e18)
  // const newMine = await NewMine.at("0x665d01B3757d530dC136942b94B16b27bf1d1c8b");
  // await newMine.emergencyWithdrawNew(accounts[0])
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x665d01B3757d530dC136942b94B16b27bf1d1c8b')/1e18)



};

