const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test claimRaisedWei function of IcoRocketFuel contract', async (accounts) => {

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

  let previousBalance;
  let spentWei;
  let beneficiary = accounts[5];

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
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});

    // Buy token
    spentWei = goal;
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    // Finalize the crowdsale. The state of crowdsale will change to Closed.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});
  });

  it('should claim raised Wei', async function () {
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    // Crowdsale owner claim raised Wei. This is the testing target function.
    await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
      {from: crowdsaleOwner});

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    // Raised Wei shoud be set to 0.
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    // Verify rest states of crowdsale.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let receivedCommission = spentWei * commission / 100;
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber() + spentWei - receivedCommission,
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber() - spentWei,
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (zero token address)', async function () {
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(0, beneficiary, 
        {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei - receivedCommission, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), 
      previousBalance.toNumber() - receivedCommission,
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (zero beneficiary address)', async function () {
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, 0, 
        {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei - receivedCommission, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), 
      previousBalance.toNumber() - receivedCommission,
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (not crowdsale owner)', async function () {
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
        {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], spentWei - receivedCommission, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), 
      previousBalance.toNumber() - receivedCommission,
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (crowdsale state is Active)', async function () {
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});

    // Buy token
    spentWei = goal;
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
        {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    
    // All states of crowdsale are not changed.
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
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (crowdsale state is Refunding)', async function () {
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});

    // Buy token
    spentWei = goal;
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: spentWei - 1, from: tokenBuyer});
    // Transfer sold number of tokens for IcoRocketFuel contract.
    await crowdsaleToken.transfer(icoRocketFuel.address, spentWei * rate, 
      {from: crowdsaleOwner});
    // Make sure the sold number of tokens was transferred.
    let tokenBalance = await crowdsaleToken.balanceOf(icoRocketFuel.address);
    assert.equal(tokenBalance, spentWei * rate, 'Token balance is incorrect.');
    
    // After finalization, balance of IcoRocketFuel will decrease accordingly.
    previousBalance = await web3.eth.getBalance(icoRocketFuel.address);

    // Finalize the crowdsale. The state of crowdsale will change to Closed.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
        {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 1, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei again', async function () {
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    // Crowdsale owner claim raised Wei.
    await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
      {from: crowdsaleOwner});

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei again. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
        {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    let receivedCommission = spentWei * commission / 100;
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], goal, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
    previousBeneficiary.toNumber() + spentWei - receivedCommission,
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber() - spentWei,
      'Balance of IcoRocketFuel contract is incorrect.');
  });

  it('should not claim raised Wei (no raised Wei)', async function () {
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await crowdsaleToken.mint(crowdsaleOwner, mintTokens, {from: crowdsaleOwner});
    // Set goal to 0.
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, 0, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});

    // Finalize the crowdsale. The state of crowdsale will change to Closed.
    await icoRocketFuel.finalize(crowdsaleToken.address, {from: crowdsaleOwner});

    let previousBalance = await web3.eth.getBalance(icoRocketFuel.address);    
    let previousBeneficiary = await web3.eth.getBalance(beneficiary);

    let thrown = false;
    try {
      // Crowdsale owner claim raised Wei. This is the testing target function.
      await icoRocketFuel.claimRaisedWei(crowdsaleToken.address, beneficiary, 
        {from: owner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Get crowdsale states, and verify the states.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    
    // All states of crowdsale are not changed.
    assert.equal(crowdsale[0], crowdsaleOwner, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], refundWallet, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], cap, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], 0, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], rate, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], minInvest, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], closingTime, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], earlyClosure, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], commission, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 2, 'Crowdsale state is incorrect.'); 

    // Verify balance.
    let currentBeneficiary = await web3.eth.getBalance(beneficiary);
    let currentBalance = await web3.eth.getBalance(icoRocketFuel.address);
    assert.equal(currentBeneficiary.toNumber(), 
      previousBeneficiary.toNumber(),
      'Balance of beneficiary wallet is incorrect.');
    assert.equal(currentBalance.toNumber(), previousBalance.toNumber(),
      'Balance of IcoRocketFuel contract is incorrect.');
  });
})