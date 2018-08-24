const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const MintableToken = artifacts.require('MintableToken');
const BigNumber = web3.BigNumber;

contract('Test createCrowdsale function of IcoRocketFuel contract', async (accounts) => {

  let icoRocketFuel;
  let fusionsKYC;
  let fusionsCrowdsaleController;
  let crowdsaleToken;

  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
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

  before(async function () {
  });

  beforeEach(async () => {
    fusionsKYC = await FusionsKYC.new({from: owner});
    fusionsCrowdsaleController = await FusionsCrowdsaleController.new({from: owner});
    icoRocketFuel = await IcoRocketFuel.new(commissionWallet, 
      fusionsKYC.address, fusionsCrowdsaleController.address, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await fusionsCrowdsaleController.approveCrowdsale(crowdsaleToken.address, 0, 0);
  });

  it('should create crowdsale', async function () {
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission,
      {from: crowdsaleOwner});
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
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
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');
  });

  function assertDefaultCrowdsale(crowdsale) {
    assert.equal(crowdsale[0], ZERO_ADDR, 'Crowdsale owner is incorrect.');
    assert.equal(crowdsale[1], ZERO_ADDR, 'Crowdsale refund wallet is incorrect.');
    assert.equal(crowdsale[2], 0, 'Crowdsale cap is incorrect.');
    assert.equal(crowdsale[3], 0, 'Crowdsale goal is incorrect.');
    assert.equal(crowdsale[4], 0, 'Crowdsale Wei raised is incorrect.');
    assert.equal(crowdsale[5], 0, 'Crowdsale token exchange rate is incorrect.');
    assert.equal(crowdsale[6], 0, 'Crowdsale minimum investment is incorrect.');
    assert.equal(crowdsale[7], 0, 'Crowdsale closing time is incorrect.');
    assert.equal(crowdsale[8], false, 'Crowdsale early closure is incorrect.');
    assert.equal(crowdsale[9], 0, 'Crowdsale commission is incorrect.');
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');
  }

  it('should not create crowdsale (zero token address)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(0, refundWallet, 
        cap, goal, rate, minInvest, closingTime, earlyClosure,
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (zero refund wallet address)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, 0, 
        cap, goal, rate, minInvest, closingTime, earlyClosure,
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (goal > cap)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
        cap, goal + cap, rate, minInvest, closingTime, earlyClosure,
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (minInvest == 0)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
        cap, goal, rate, 0, closingTime, earlyClosure, commission, 
        {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (commission > 100)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
        cap, goal, rate, minInvest, closingTime, earlyClosure, 101, 
        {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (cap * rate cause overflow)', async function () {
    let thrown = false;
    try {
      // The cap is set to 2**255 and rate is set to 2, 
      // which will cause overflow (max. value is 2**256 -1).
      // To verify this, try either set cap to 2**254 or
      // set rate to 1, the test case will fail.
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
        new BigNumber(2 ** 255), goal, 2, minInvest, closingTime, earlyClosure, 
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
    assertDefaultCrowdsale(crowdsale);
  });

  it('should not create crowdsale (duplicate token address)', async function () {
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure,
      commission, {from: crowdsaleOwner});
    
    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
        cap, goal, rate, minInvest, closingTime, earlyClosure,
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    // Verify contract. Nothing should be changed.
    let crowdsale = await icoRocketFuel.crowdsales(crowdsaleToken.address);
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
    assert.equal(crowdsale[10], 0, 'Crowdsale state is incorrect.');
  });

  it('should not create crowdsale (not approved token)', async function () {
    let notApprovedToken = await MintableToken.new({from: crowdsaleOwner});

    let thrown = false;
    try {
      await icoRocketFuel.createCrowdsale(notApprovedToken.address,
        refundWallet, cap, goal, rate, minInvest, closingTime, earlyClosure,
        commission, {from: crowdsaleOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let crowdsale = await icoRocketFuel.crowdsales(notApprovedToken.address);
    assertDefaultCrowdsale(crowdsale);
  });
})