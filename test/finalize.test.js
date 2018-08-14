const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test finalize function of IcoRocketFuel contract', async (accounts) => {

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

  before(async function () {
  });

  beforeEach(async () => {
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  it('should finalize (crowdsale state = Closed)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balance of commission wallet.
    // Later, balance will increase with commission income.
    let previousCommission = await web3.eth.getBalance(commissionWallet);
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    
    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    // Only Wei raised and crowdsale state changed to Closed.
    assert.equal(crowdsale[4], spentWei - receivedCommission, 
      'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.');
    // Rest crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');

    // Verify balance.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber() + receivedCommission,
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber() - receivedCommission,
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should finalize and refund surplus tokens', async function () {
    let spentWei = goal;
    let surplus = 1000;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate + surplus, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate + surplus, 'Token balance is incorrect.');
    
    // Log previous balance of commission wallet.
    // Later, balance will increase with commission income.
    let previousCommission = await web3.eth.getBalance(commissionWallet);
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);
    // After finalization, token balance of refund wallet will be increased.
    let previousTokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);

    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    
    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    // Only Wei raised and crowdsale state changed to Closed.
    assert.equal(crowdsale[4], spentWei - receivedCommission, 
      'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.');
    // Rest crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');

    // Verify balance.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber() + receivedCommission,
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber() - receivedCommission,
     'Balance of IcoRocketFuel contract is incorrect.');

    // Verify refund surplus tokens.
    let tokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber() + surplus,
      'Refunded surplus tokens is incorrect.');
  });

  it('should finalize (insufficient raised, crowdsale state = Refunding)', async function () {
    /*
     * This will test the condition:
     *   (crowdsales[_token].raised >= crowdsales[_token].goal)
     * of the _goalReached(ERC20 _token) function.
     */

    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei - 1, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    // Note the token balance will decrease to 0 after fainalization.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balances which should not change after finalization.
    let previousCommission = await web3.eth.getBalance(commissionWallet);    
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);
    // Log previous token balance of refund wallet.
    // The token balance should increase after finalization.
    // The increased amount is the spent Wei multiply rate.
    let previousTokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);

    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Verify token balance which should be 0 due to all tokens were refunded.
    tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, 0, 'Token balance is incorrect.');

    // Verify token balance of the refund wallet.
    let tokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber() + spentWei * rate, 
      'Token balance of refund wallet is incorrect.');

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    // Wei raised should be set to 0 and crowdsale state changed to Refunding.
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.');
    
    // Rest crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');    
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');

    // Verify balances which should not change.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should finalize (insufficient token, crowdsale state = Refunding)', async function () {
    /*
     * This will test the condition:
     *   (_token.balanceOf(address(this)) >= crowdsales[_token].raised.mul(crowdsales[_token].rate))
     * of the _goalReached(ERC20 _token) function.
     */

    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer (sold number - 1) of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate - 1, 
      {from: crowdsaleOwner});
    // Make sure the (sold number - 1) of tokens was transferred.
    // Note the token balance will decrease to 0 after fainalization.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate - 1, 'Token balance is incorrect.');
    
    // Log previous balances which should not change after finalization.
    let previousCommission = await web3.eth.getBalance(commissionWallet);    
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);
    // Log previous token balance of refund wallet.
    // The token balance should increase after finalization.
    // The increased amount is the (spent Wei * rate - 1).
    let previousTokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);

    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Verify token balance which should be 0 due to all tokens were refunded.
    tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, 0, 'Token balance is incorrect.');

    // Verify token balance of the refund wallet.
    let tokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber() + spentWei * rate - 1, 
      'Token balance of refund wallet is incorrect.');

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    // Wei raised should be set to 0 and crowdsale state changed to Refunding.
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.');
    
    // Rest crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');    
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');

    // Verify balances which should not change.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not finalize (zero token address)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balance of commission wallet.
    // Later, balance will increase with commission income.
    let previousCommission = await web3.eth.getBalance(commissionWallet);
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    let thrown = false;
    try {
      // Finalize the crowdsale. This is the function to be tested.
      await icoRocketFuel.finalize(0, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    
    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    
    // All crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');

    // Verify balance.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not finalize again (unable to finalize a closed crowdsale)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');

    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);    
    // Crowdsale state should be Closed.
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.');

    let thrown = false;
    try {
      // Finalize the crowdsale again. This is the function to be tested.
      await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);    
  });

  it('should not finalize again (unable to finalize a refunding crowdsale)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei - 1, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');

    // Finalize the crowdsale.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);    
    // Crowdsale state should be Refunding.
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.');

    let thrown = false;
    try {
      // Finalize the crowdsale again. This is the function to be tested.
      await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
  });

  it('should not finalize (only crowdsale owner can finalize)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balance of commission wallet.
    // Later, balance will increase with commission income.
    let previousCommission = await web3.eth.getBalance(commissionWallet);
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    let thrown = false;
    try {
      // Finalize the crowdsale. This is the function to be tested.
      await icoRocketFuel.finalize(crowdsaleToken.address, {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);    
    
    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    
    // All crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');

    // Verify balance.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not finalize (too early to finalize)', async function () {
    // Create a new crowdsale which does not allow early closure.
    let tokenNotAllowEarlyClosure = await MintableToken.new({from: crowdsaleOwner});
    await tokenNotAllowEarlyClosure.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(tokenNotAllowEarlyClosure.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, false, commission, {from: crowdsaleOwner});

    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      tokenNotAllowEarlyClosure.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await tokenNotAllowEarlyClosure.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await tokenNotAllowEarlyClosure.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balance of commission wallet.
    // Later, balance will increase with commission income.
    let previousCommission = await web3.eth.getBalance(commissionWallet);
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    let thrown = false;
    try {
      // Finalize the crowdsale. This is the function to be tested.
      await icoRocketFuel.finalize(tokenNotAllowEarlyClosure.address, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);    
    
    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(tokenNotAllowEarlyClosure.address);
    
    // All crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], false, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');

    // Verify balance.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  // Sleep for n milliseconds.
  // It is provided for waiting few seconds to finalize crowdsales 
  // which were not allowed early closure.
  function sleep(milliseconds) {
    let start = new Date().getTime();
    for (let i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }

  it('should finalize (not allow early closure, insufficient raised, crowdsale state = Refunding)',
    async function () {
    // Create a new crowdsale which does not allow early closure.
    // It only allows buyers to buy tokens within next 2 seconds.
    let newClosingTime = Math.floor((new Date).getTime()/1000) + 2;
    let tokenNotAllowEarlyClosure = await MintableToken.new({from: crowdsaleOwner});
    await tokenNotAllowEarlyClosure.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(tokenNotAllowEarlyClosure.address, refundWallet, 
      cap, goal, rate, minInvest, newClosingTime, false, commission, {from: crowdsaleOwner});

    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      tokenNotAllowEarlyClosure.address, {value: spentWei - 1, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await tokenNotAllowEarlyClosure.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    // Note the token balance will decrease to 0 after fainalization.
    let tokenBalance = await tokenNotAllowEarlyClosure.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // Log previous balances which should not change after finalization.
    let previousCommission = await web3.eth.getBalance(commissionWallet);    
    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);
    // Log previous token balance of refund wallet.
    // The token balance should increase after finalization.
    // The increased amount is the spent Wei multiply rate.
    let previousTokenBalanceOfRefundWallet = await tokenNotAllowEarlyClosure.balanceOf(refundWallet);

    // Sleep for 3 seconds to ensure that the crowdsale is allowed to finalize.
    sleep(3000);
    // Finalize the crowdsale. This is the function to be tested.
    await icoRocketFuel.finalize(tokenNotAllowEarlyClosure.address, {from: crowdsaleOwner});

    // Verify token balance which should be 0 due to all tokens were refunded.
    tokenBalance = await tokenNotAllowEarlyClosure.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, 0, 'Token balance is incorrect.');

    // Verify token balance of the refund wallet.
    let tokenBalanceOfRefundWallet = await tokenNotAllowEarlyClosure.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber() + spentWei * rate, 
      'Token balance of refund wallet is incorrect.');

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(tokenNotAllowEarlyClosure.address);
    // Wei raised should be set to 0 and crowdsale state changed to Refunding.
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.');
    
    // Rest crowdsale states are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');    
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], newClosingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], false, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');

    // Verify balances which should not change.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });
})