const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test claimRefund function of IcoRocketFuel contract', async (accounts) => {

  let icoRocketFuel;
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
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap * 100, goal * 100, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  // Returns a random number between min (included) and max (excluded)
  function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }

  it('should claim refund multiple times', async function () {
    let buyer1Count = 0;
    let buyer2Count = 0;
    let buyer3Count = 0;
    let raisedWei = 0;
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

    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, raisedWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, raisedWei * rate, 'Token balance is incorrect.');

    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Declare variables for verifying test result.
    let previousBalanceOfBuyer1; // Balance of buyer1 (before claim refund)
    let previousBalanceOfBuyer2; // Balance of buyer2 (before claim refund)
    let previousBalanceOfBuyer3; // Balance of buyer2 (before claim refund)

    // receipt is the receipt of calling claim refund function.
    // Use receipt.receipt.gasUsed to get gas used by claim refund function.
    // tx is the transaction of calling claim refund function.
    // Use tx.gasPrice to get gas price when calling claim refund function.
    // Consumed Wei amount of calling claim refund function = receipt.receipt.gasUsed * tx.gasPrice.
    let receipt;      
    let tx;

    let tokenBalanceOfBuyer; // Token unit amount of the crowdsale token owned by buyer.
    let deposit; // Buyer's deposited Wei amount of crowdsale.
    let balanceOfBuyer; // Balance of buyer in Wei.

    // Log previous balances before the first buyer claimed refund.
    previousBalanceOfBuyer1 = await web3.eth.getBalance(tokenBuyer);
    previousBalanceOfBuyer2 = await web3.eth.getBalance(tokenBuyer2);
    previousBalanceOfBuyer3 = await web3.eth.getBalance(tokenBuyer3);
    
    if (buyer1Count > 0) {
      // Start to claim refund for the first buyer.
      receipt = await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer});
      tx = await web3.eth.getTransaction(receipt.tx);
    }
    
    // Verify token amount. Since crowdsale was failed, all should be 0.
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer2);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer3);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    // Verify deposits.
    deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer2, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), sentWei7 * buyer2Count, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer3, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), sentWei3 * buyer3Count, 'Deposited Wei amount is incorrect.');
    // Verify balances.
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    if (buyer1Count > 0) {
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer1.toNumber() 
        + sentWei * buyer1Count - receipt.receipt.gasUsed * tx.gasPrice, 
        'Balance amount is incorrect.');
    } else {
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer1.toNumber(), 'Balance amount is incorrect.');
    }
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer2);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer2.toNumber(), 'Balance amount is incorrect.');
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer3);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer3.toNumber(), 'Balance amount is incorrect.');

    // Log previous balances before the second buyer claimed refund.
    previousBalanceOfBuyer1 = await web3.eth.getBalance(tokenBuyer);
    previousBalanceOfBuyer2 = await web3.eth.getBalance(tokenBuyer2);
    previousBalanceOfBuyer3 = await web3.eth.getBalance(tokenBuyer3);
    if (buyer2Count > 0) {
      // Start to claim refund for the second buyer.
      receipt = await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer2});
      tx = await web3.eth.getTransaction(receipt.tx);
    }
    // Verify token amount. Since crowdsale was failed, all should be 0.
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer2);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer3);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    // Verify deposits.
    deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer2, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer3, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), sentWei3 * buyer3Count, 'Deposited Wei amount is incorrect.');
    // Verify balances.
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer1.toNumber(), 'Balance amount is incorrect.');
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer2);
    if (buyer2Count > 0) {   
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer2.toNumber() 
        + sentWei7 * buyer2Count - receipt.receipt.gasUsed * tx.gasPrice, 
        'Balance amount is incorrect.');
    } else {
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer2.toNumber(), 'Balance amount is incorrect.');
    }
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer3);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer3.toNumber(), 'Balance amount is incorrect.');

    // Log previous balances before the third buyer claimed refund.
    previousBalanceOfBuyer1 = await web3.eth.getBalance(tokenBuyer);
    previousBalanceOfBuyer2 = await web3.eth.getBalance(tokenBuyer2);
    previousBalanceOfBuyer3 = await web3.eth.getBalance(tokenBuyer3);
    if (buyer3Count > 0) { 
      // Start to claim refund for the third buyer.
      receipt = await icoRocketFuel.claimRefund(crowdsaleToken.address, {from: tokenBuyer3});
      tx = await web3.eth.getTransaction(receipt.tx);
    }
    // Verify token amount. Since crowdsale was failed, all should be 0.
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer2);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    tokenBalanceOfBuyer = await crowdsaleToken.balanceOf(tokenBuyer3);
    assert.equal(tokenBalanceOfBuyer.toNumber(), 0, 'Token unit amount is incorrect.');
    // Verify deposits.
    deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer2, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    deposit = await icoRocketFuel.deposits(tokenBuyer3, crowdsaleToken.address);
    assert.equal(deposit.toNumber(), 0, 'Deposited Wei amount is incorrect.');
    // Verify balances.
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer1.toNumber(), 'Balance amount is incorrect.');
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer2);
    assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer2.toNumber(), 'Balance amount is incorrect.');    
    balanceOfBuyer = await web3.eth.getBalance(tokenBuyer3);
    if (buyer3Count > 0) { 
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer3.toNumber() 
        + sentWei3 * buyer3Count - receipt.receipt.gasUsed * tx.gasPrice, 
        'Balance amount is incorrect.');
    } else {
      assert.equal(balanceOfBuyer.toNumber(), previousBalanceOfBuyer3.toNumber(), 'Balance amount is incorrect.');
    } 
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