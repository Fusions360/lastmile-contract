const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const MintableToken = artifacts.require('MintableToken');
const BigNumber = web3.BigNumber;

contract('Test pauseCrowdsale function of IcoRocketFuel contract', async (accounts) => {

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

  before(async function () {
  });

  beforeEach(async () => {
    fusionsKYC = await FusionsKYC.new({from: owner});
    fusionsCrowdsaleController = await FusionsCrowdsaleController.new({from: owner});
    icoRocketFuel = await IcoRocketFuel.new(commissionWallet, 
      fusionsKYC.address, fusionsCrowdsaleController.address, {from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await fusionsCrowdsaleController.approveCrowdsale(crowdsaleToken.address, 0, 0);
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  it('should pause crowdsale', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
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

    // Pause the crowdsale. This is the function to be tested.
    await icoRocketFuel.pauseCrowdsale(crowdsaleToken.address, {from: owner});

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
    // Only crowdsale state changed to Refunding.
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.');
    // Wei raised should be set to 0.
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
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

  it('should not pause crowdsale (zero token address)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
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

    let thrown = false;
    try {
      // Pause the crowdsale. This is the function to be tested.
      await icoRocketFuel.pauseCrowdsale(0, {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify token balance which should be 0 due to all tokens were refunded.
    tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');

    // Verify token balance of the refund wallet.
    let tokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber(), 
      'Token balance of refund wallet is incorrect.');

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

    // Verify balances which should not change.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not pause crowdsale (not contract owner)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
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

    let thrown = false;
    try {
      // Pause the crowdsale. This is the function to be tested.
      await icoRocketFuel.pauseCrowdsale(crowdsaleToken.address, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify token balance which should be 0 due to all tokens were refunded.
    tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');

    // Verify token balance of the refund wallet.
    let tokenBalanceOfRefundWallet = await crowdsaleToken.balanceOf(refundWallet);
    assert.equal(tokenBalanceOfRefundWallet.toNumber(), 
      previousTokenBalanceOfRefundWallet.toNumber(), 
      'Token balance of refund wallet is incorrect.');

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

    // Verify balances which should not change.
    let currentCommission = await web3.eth.getBalance(commissionWallet);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentCommission.toNumber(), previousCommission.toNumber(),
     'Balance of commission wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
     'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not pause crowdsale (unable to pause a Closed crowdsale)', async function () {
    let spentWei = goal;
    // Buy token
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    // Note the token balance will decrease to 0 after fainalization.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');

    // Finalize to set state of crowdsale to Closed.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    let thrown = false;
    try {
      // Pause the crowdsale. This is the function to be tested.
      await icoRocketFuel.pauseCrowdsale(crowdsaleToken.address, {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
  });

  it('should not pause crowdsale (unable to pause a Refunding crowdsale)', async function () {
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

    // Finalize to set state of crowdsale to Refunding.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    let thrown = false;
    try {
      // Pause the crowdsale. This is the function to be tested.
      await icoRocketFuel.pauseCrowdsale(crowdsaleToken.address, {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
  });
})