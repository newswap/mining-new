const NewMineSingle = artifacts.require("NewMineSingle");
const IUniswapV2Pair = artifacts.require("IUniswapV2Pair")

module.exports = async function (deployer, network, accounts) {
  console.log("accounts[0]:"+accounts[0]);

  // const lpToken = "0x56ae975581a382193ff36579c81281e179486c43" //NUSDT_NEW  TESTNET
  // const newPerBlock = web3.utils.toWei("1", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // const startBlock = number + 200; // 10分钟后开启    
  // // const oneYearBlock = 365*24*60*20; //挖一年 
  // const oneYearBlock = 200; // 挖10分钟
  // // _lpToken, _newPerBlock, _startBlock, _endBlock
  // await deployer.deploy(NewMineSingle, lpToken, newPerBlock, startBlock, startBlock+oneYearBlock);
  // const newMineSingle = await NewMineSingle.deployed();
  // console.log("newMineSingle:" + newMineSingle.address);

  // TODO 给newMine 转NEW

  // dev
  // newMineSingle: 0x6b0070Ed4C588F86Deb07ca115EBd8AF4B30017e
  // testnet/mainnet
  // newMineSingle: 0x8b028f0F001417E3b9c086C5740722839DaB12b0

  // const newMine = await NewMineSingle.at("0x8b028f0f001417e3b9c086c5740722839dab12b0");
  // console.log(await newMine.lpToken())
  // console.log(await newMine.newPerBlock()/1e18)
  // console.log(await newMine.lastRewardBlock())
  // console.log(await newMine.endBlock())
  // console.log(await newMine.owner())

  // 激活矿池
  // const newMine = await NewMineSingle.at("");
  // const newPerBlock = web3.utils.toWei("1", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // console.log(number)
  // const endBlock = number+1+600  //再挖30分钟
  // var tx = await newMine.activate(endBlock, newPerBlock)
  // console.log(tx)


  // 紧急提现
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x665d01B3757d530dC136942b94B16b27bf1d1c8b')/1e18)
  // const newMine = await NewMineSingle.at("0x665d01B3757d530dC136942b94B16b27bf1d1c8b");
  // await newMine.emergencyWithdrawNew(accounts[0])
  // console.log(await web3.eth.getBalance(accounts[0])/1e18)
  // console.log(await web3.eth.getBalance('0x665d01B3757d530dC136942b94B16b27bf1d1c8b')/1e18)


  // const pair = await IUniswapV2Pair.at("0x56ae975581a382193ff36579c81281e179486c43")
  // console.log(await pair.balanceOf("0x8b028f0F001417E3b9c086C5740722839DaB12b0")/1e18)
};

