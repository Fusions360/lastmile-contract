const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const MintableToken = artifacts.require('MintableToken');
const BigNumber = web3.BigNumber;

contract('Test buyToken function with KYC of IcoRocketFuel contract', async (accounts) => {

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

  let baseKYCLevel = 100;
  let countryBlacklist = 1;

  before(async function () {
  });

  beforeEach(async () => {
    fusionsKYC = await FusionsKYC.new({from: owner});
    fusionsCrowdsaleController = await FusionsCrowdsaleController.new({from: owner});
    icoRocketFuel = await IcoRocketFuel.new(commissionWallet, 
      fusionsKYC.address, fusionsCrowdsaleController.address, {from: owner});
    crowdsaleToken = await MintableToken.new({from: crowdsaleOwner});
    await fusionsCrowdsaleController.approveCrowdsale(crowdsaleToken.address, 
      baseKYCLevel, countryBlacklist);
    await icoRocketFuel.createCrowdsale(crowdsaleToken.address, refundWallet, 
      cap, goal, rate, minInvest, closingTime, earlyClosure, commission, 
      {from: crowdsaleOwner});
  });

  it('should buy token', async function () {
    let expiresAt = Math.floor((new Date).getTime()/1000) + 1000;
    let kycLevel = baseKYCLevel;
    let nationalities = 2;

    // Register KYC data for token buyer.
    await fusionsKYC.setKYC(tokenBuyer, expiresAt, kycLevel, nationalities);

    // Buy token.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: sentWei, from: tokenBuyer});

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, sentWei, 'Deposited Wei amount is incorrect.');
  });

  it('should buy token (toughest KYC level)', async function () {
    let expiresAt = Math.floor((new Date).getTime()/1000) + 1000;
    let kycLevel = 255;
    let nationalities = 2;

    // Register KYC data for token buyer.
    await fusionsKYC.setKYC(tokenBuyer, expiresAt, kycLevel, nationalities);

    // Buy token.
    await icoRocketFuel.buyToken(
      crowdsaleToken.address, {value: sentWei, from: tokenBuyer});

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, sentWei, 'Deposited Wei amount is incorrect.');
  });

  it('should not buy token (expired KYC)', async function () {
    let expiresAt = Math.floor((new Date).getTime()/1000) - 1000;
    let kycLevel = baseKYCLevel;
    let nationalities = 2;

    // Register KYC data for token buyer.
    await fusionsKYC.setKYC(tokenBuyer, expiresAt, kycLevel, nationalities);

    let thrown = false;
    try {
      // Buy token.
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
  });

  it('should not buy token (lower KYC level)', async function () {
    let expiresAt = Math.floor((new Date).getTime()/1000) + 1000;
    let kycLevel = baseKYCLevel - 1;
    let nationalities = 2;

    // Register KYC data for token buyer.
    await fusionsKYC.setKYC(tokenBuyer, expiresAt, kycLevel, nationalities);

    let thrown = false;
    try {
      // Buy token.
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
  });

  it('should not buy token (country blacklist)', async function () {
    let expiresAt = Math.floor((new Date).getTime()/1000) + 1000;
    let kycLevel = baseKYCLevel;
    let nationalities = 3;

    // Register KYC data for token buyer.
    await fusionsKYC.setKYC(tokenBuyer, expiresAt, kycLevel, nationalities);

    let thrown = false;
    try {
      // Buy token.
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
  });

  it('should not buy token (no KYC)', async function () {
    let thrown = false;
    try {
      // Buy token.
      await icoRocketFuel.buyToken(
        crowdsaleToken.address, {value: sentWei, from: tokenBuyer});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);

    // Verify deposit.
    let deposit = await icoRocketFuel.deposits(tokenBuyer, crowdsaleToken.address);
    assert.equal(deposit, 0, 'Deposited Wei amount is incorrect.');
  });
})