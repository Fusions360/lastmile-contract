const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const FusionsKYC = artifacts.require('FusionsKYC');
const FusionsCrowdsaleController = artifacts.require('FusionsCrowdsaleController');
const BigNumber = web3.BigNumber;

contract('Test setCommissionWallet function of IcoRocketFuel contract', async (accounts) => {
  let icoRocketFuel;
  let fusionsKYC;
  let fusionsCrowdsaleController;
  let owner = accounts[0];
  let commissionWallet = accounts[1];
  let notOwner = accounts[2];
  let defaultCommissionWallet = accounts[3];

  before(async function () {
  });

  beforeEach(async () => {
    fusionsKYC = await FusionsKYC.new({from: owner});
    fusionsCrowdsaleController = await FusionsCrowdsaleController.new({from: owner});
    icoRocketFuel = await IcoRocketFuel.new(defaultCommissionWallet, 
      fusionsKYC.address, fusionsCrowdsaleController.address, {from: owner});
  });

  it('should set commission wallet', async function () {
    await icoRocketFuel.setCommissionWallet(commissionWallet, {from: owner});
    let actualCommissionWallet = await icoRocketFuel.commissionWallet();
    assert.equal(actualCommissionWallet, commissionWallet,
      'Failed to set commission wallet.');
  });

  it('should not set commission wallet (permission denied)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.setCommissionWallet(commissionWallet, {from: notOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let actualCommissionWallet = await icoRocketFuel.commissionWallet();
    assert.equal(actualCommissionWallet, defaultCommissionWallet,
      'Address of default commission wallet is not 0x0.');
  });

  it('should not set commission wallet (zero address)', async function () {
    let thrown = false;
    try {
      await icoRocketFuel.setCommissionWallet(0, {from: notOwner});
    } catch(e) {
      thrown = true;
    }
    assert.isTrue(thrown);
    let actualCommissionWallet = await icoRocketFuel.commissionWallet();
    assert.equal(actualCommissionWallet, defaultCommissionWallet,
      'Address of default commission wallet is not 0x0.');
  });
})