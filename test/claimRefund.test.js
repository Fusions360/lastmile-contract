const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const MintableToken = artifacts.require('MintableToken');
const BigNumber = web3.BigNumber;

contract('Test claimRefund function of IcoRocketFuel contract', async (accounts) => {

  let icoRocketFuel;
  let fusionsKYC;
  let fusionsCrowdsaleController;
  let crowdsaleToken;

  let owner = accounts[0];
  let commissionWallet = accounts[1];
  let crowdsaleOwner = accounts[2];
  let mintTokens = 10000;

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
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap * 100, goal * 100, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  it('should claim refund', async function () {
    // Note actual goal has been multiply 100 when creating crowdsale.
    // Therefore, this buy token call will not cause crowdsale to reach goal.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: goal, from: tokenBuyer});

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, goal * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, goal * rate, 'Token balance is incorrect.');
    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Log previous balances before the third buyer claimed refund.
    let previousBalance = await web3.eth.getBalance(tokenBuyer);
    
    // Start to claim tokens for the first buyer.
    let receipt = await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer});
    let tx = await web3.eth.getTransaction(receipt.tx);
    
    // Verify token amount.
    let tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
   
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');

    // Verify balance.
    let balanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    assert.equal(balanceOfBuyer.toNumber(), previousBalance.toNumber() 
      + goal - (receipt.receipt.gasUsed * tx.gasPrice), 
      'Balance amount is incorrect.');
  });

  it('should not claim refund (zero token address)', async function () {
    // Note actual goal has been multiply 100 when creating crowdsale.
    // Therefore, this buy token call will not cause crowdsale to reach goal.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: goal, from: tokenBuyer});

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, goal * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, goal * rate, 'Token balance is incorrect.');
    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    
    let thrown = false;
    try {
      // Start to claim tokens for the first buyer.
      await icoRocketFuel.claimRefund(0, {from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    
    // Verify token amount.
    let tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
   
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), goal, 'Deposited Wei amount is incorrect.');
  });

  it('should not claim refund (crowdsale state is Active)', async function () {
    // Note actual goal has been multiply 100 when creating crowdsale.
    // Therefore, this buy token call will not cause crowdsale to reach goal.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: goal, from: tokenBuyer});

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, goal * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, goal * rate, 'Token balance is incorrect.');
    
    let thrown = false;
    try {
      // Start to claim tokens for the first buyer.
      await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    
    // Verify token amount.
    let tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
   
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), goal, 'Deposited Wei amount is incorrect.');
  });

  it('should not claim refund (crowdsale state is Closed)', async function () {
    // Note actual goal has been multiply 100 when creating crowdsale.
    // Therefore, it has to multiply 100 to let the crowdsale state become Closed after finalization.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: goal * 100, from: tokenBuyer});

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, goal * 100 * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, goal * 100 * rate, 'Token balance is incorrect.');
    
    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    let thrown = false;
    try {
      // Start to claim tokens for the first buyer.
      await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    
    // Verify token amount.
    let tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
   
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), goal * 100, 'Deposited Wei amount is incorrect.');
  });

  it('should not claim refund (no deposit)', async function () {
    // Note actual goal has been multiply 100 when creating crowdsale.
    // Therefore, this buy token call will not cause crowdsale to reach goal.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: goal, from: tokenBuyer});

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, goal * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, goal * rate, 'Token balance is incorrect.');
    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    
    let thrown = false;
    try {
      // Start to claim tokens for the first buyer.
      await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer2});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    
    // Verify token amount.
    let tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer2);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
   
    // Verify deposits.
    let deposit = await icoRocketFuel.deposits(tokenBuyer2, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
  });
})