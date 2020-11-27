const NewMine = artifacts.require("NewMine");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")

module.exports = async function (deployer, network, accounts) {
  // console.log("accounts[0]:"+accounts[0]);
  
  // const wnew = "0xf4905b9bc02ce21c98eac1803693a9357d5253bf" // test/main
  // const newPerBlock = web3.utils.toWei("57", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // const startBlock = number + 600; // 30分钟后开启    
  // // const oneYearBlock = 365*24*60*20; //挖一年 
  // const oneYearBlock = 600 // 挖30分钟  挖到7点
  // // _wNew, _newPerBlock, _startBlock, _endBlock
  // await deployer.deploy(NewMine, wnew, newPerBlock, startBlock, startBlock+oneYearBlock);
  // const newMine = await NewMine.deployed();
  // console.log("newMine:" + newMine.address);

  // // // // 创建nusdt-new矿池  id=0
  // const NUSDT_NEW = '0x56ae975581a382193ff36579c81281e179486c43' //TESTNET
  // await newMine.addPool(NUSDT_NEW);
  // var pool = await newMine.poolInfo(0);
  // console.log(pool.lpToken)
  // console.log(Number(pool.allocPoint))
  // console.log(Number(pool.lastRewardBlock))
  // console.log(Number(pool.accNewPerShare))
  // console.log(Number(pool.newPerLP))
  // console.log(pool.state)

  // const pair = await IUniswapV2Pair.at(NUSDT_NEW)
  // // console.log(Number(await pair.totalSupply()))
  // // console.log(await pair.token1()) // wnew
  // const reserves = await pair.getReserves()
  // // console.log(Number(reserves.reserve1))
  // console.log((Number(reserves.reserve1)*1e12/Number(await pair.totalSupply())) == Number(pool.newPerLP))

  


  // TestNET
  // newMine: 0xD58560E0Af6C64264AbBEcf3450C901bF922d927
  // 第一个池子NUSDT_NEW： '0x56ae975581a382193ff36579c81281e179486c43'


  // 激活矿池
  // const newMine = await NewMine.at("0x8B81c6535d6394dECA5F234063E972E45d248EeE");
  // const newPerBlock = web3.utils.toWei("32", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // console.log(number)
  // const endBlock = number+1+600  //再挖30分钟
  // var tx = await newMine.activate(endBlock, newPerBlock, true)
  // console.log(tx)




};

