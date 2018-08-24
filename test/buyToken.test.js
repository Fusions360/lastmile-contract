const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const MintableToken = artifacts.require('MintableToken');
const BigNumber = web3.BigNumber;

contract('Test buyToken function of IcoRocketFuel contract', async (accounts) => {

  let icoRocketFuel;
  let fusionsKYC;
  let fusionsCrowdsaleController;
  let crowdsaleToken;

  let owner = accounts[0];
  let commissionWallet = accounts[1];
  let crowdsaleOwner = accounts[2];

  let refundWallet = accounts[3];
  let cap = 100;
  let goal = 20;
  let rate = 5;
  let minInvest = 2;
  let closingTime = Math.floor((new Date).getTime()/1000) + 1000;
  let earlyClosure = true;
  let commission = 10;

  let tokenBuyer = accounts[4];
  let sentWei = 10;
  let tokenBuyer2 = accounts[5];
  let sentWei7 = 7;
  let tokenBuyer3 = accounts[6];
  let sentWei3 = 3;  

  before(async function () {
  });

  beforeEach(async () => {
    fusionsKYC = await FusionsKYC.new({from: owner});
    fusionsCrowdsaleController = await FusionsCrowdsaleController.new({from: owner});
    icoRocketFuel = await IcoRocketFuel.new(commissionWallet, 
      fusionsKYC.address, fusionsCrowdsaleController.address, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await fusionsCrowdsaleController.approveCrowdsale(crowdsaleToken.address, 0, 0);
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  // Returns a random number between min (included) and max (excluded)
  function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

  it('should buy token', async function () {
    let spentWei;
    if (getRndInteger(0, 2) > 0) {
      spentWei = 100; // cap is 100.
    } else {
      spentWei = 10;
    }

    // Log previous balance.
    let previousBalanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    // Buy token. Gas cost in Wei = receipt.receipt.gasUsed * tx.gasPrice.
    let receipt = await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    let tx = await web3.eth.getTransaction(receipt.tx);
    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, spentWei, 'Deposited Wei amount is incorrect.');
    // Verify crowdsale raised Wei amount.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], spentWei, 'Crowdsale Wei raised is incorrect.');
    // Verfify balance after purchase.
    let balanceOfContract = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(balanceOfContract, spentWei, 'Balance of contract is incorrect.');
    // Verfify balance after purchase.
    let balanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer.toNumber() 
      - spentWei - (receipt.receipt.gasUsed * tx.gasPrice), 
      'Balance amount is incorrect.');
  });

  it('should buy token multiple times', async function () {
    // Declare variables for accumulating random purchase results.
    let buyer1Count = 0;
    let buyer2Count = 0;
    let buyer3Count = 0;
    let raisedWei = 0;

    // Random purchase.
    let num = getRndInteger(2, cap / sentWei + 1);
    for (let i = 0; i < num; i++) {
      switch(getRndInteger(0, 3)) {
        case 0:
          await icoRocketFuel.buyToken(
            crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
          buyer1Count++;
          raisedWei += sentWei;
          break;
        case 1:
          await icoRocketFuel.buyToken(
            crowdsaleToken.address, {value: sentWei7, from: tokenBuyer2});
          buyer2Count++;
          raisedWei += sentWei7;
          break;
        case 2:
          await icoRocketFuel.buyToken(
            crowdsaleToken.address, {value: sentWei3, from: tokenBuyer3});
          buyer3Count++;
          raisedWei += sentWei3;
          break;
      }
    }
    
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, sentWei * buyer1Count, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer2, crowdsaleToken.address);
    assert.equal(deposit, sentWei7 * buyer2Count, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer3, crowdsaleToken.address);
    assert.equal(deposit, sentWei3 * buyer3Count, 'Deposited Wei amount is incorrect.');
    // Verify crowdsale raised Wei amount.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], raisedWei, 'Crowdsale Wei raised is incorrect.');
  });

  it('should buy token (valueX = cap)', async function () {
    // Log previous balance.
    let previousBalanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    // Buy token. Gas cost in Wei = receipt.receipt.gasUsed * tx.gasPrice.
    let receipt = await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: cap, from: tokenBuyer});
    let tx = await web3.eth.getTransaction(receipt.tx);
    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, cap, 'Deposited Wei amount is incorrect.');
    // Verify crowdsale raised Wei amount.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], cap, 'Crowdsale Wei raised is incorrect.');
    // Verfify balance after purchase.
    let balanceOfContract = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(balanceOfContract, cap, 'Balance of contract is incorrect.');
  });

  it('should not buy token (incorrect state)', async function () {
    // Finalize (no raised Wei) should cause the state change to Refunding.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    let thrown = false;
    try {
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
  });

  it('should not buy token (zero token address)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.buyToken(0, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
  });

  it('should not buy token (less than minimum investment)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: minInvest - 1, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
  });

  it('should not buy token (exceed cap)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: cap + 1, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
  });

  it('should not buy token (now >= closing time)', async function () {
    // Create a closed crowdsale.
    closedCrowdsale = await MintableToken.new({from: crowdsaleOwner});
    await fusionsCrowdsaleController.approveCrowdsale(closedCrowdsale.address, 0, 0);
    closedTime = Math.floor((new Date).getTime()/1000) - 10000;
    await icoRocketFuel.createCrowdsale(closedCrowdsale.address, refundWallet, 
      cap, goal, rate, minInvest, closedTime, earlyClosure, commission, 
      {from: crowdsaleOwner});

    let thrown = false;
    try {
      await icoRocketFuel.buyToken(
        closedCrowdsale.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
    let crowdsale = await icoRocketFuel.crowdsales(closedCrowdsale.address);
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
  });
})