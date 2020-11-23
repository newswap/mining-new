const NewMine = artifacts.require("NewMine");
const XNew = artifacts.require("XNew");

module.exports = async function (deployer, network, accounts) {
  // console.log("accounts[0]:"+accounts[0]);
  
  // await deployer.deploy(XNew);
  // const xNew = await XNew.deployed();
  // console.log("xNew:"+ xNew.address);

  // const wnew = "0xf4905b9bc02ce21c98eac1803693a9357d5253bf" // test/main
  // const xNewPerBlock = web3.utils.toWei("32", 'ether');
  // const number = await web3.eth.getBlockNumber();
  // const startBlock = number + 600; // 30分钟后开启
  // const oneYearBlock = 365*24*60*20; //挖一年
  // // _xNew,_wNew, _xNewPerBlock, _startBlock, _endBlock
  // await deployer.deploy(NewMine, xNew.address, wnew, xNewPerBlock, startBlock, startBlock+oneYearBlock);
  // const newMine = await NewMine.deployed();
  // console.log("newMine:" + newMine.address);

  // await xNew.transferOwnership(newMine.address)
  // var owner = await xNew.owner();
  // console.log("xNew owner transfer to:"+owner);
};

