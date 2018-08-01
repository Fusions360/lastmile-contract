const IcoRocketFuel = artifacts.require('IcoRocketFuel');

contract('Test setCommissionWallet function of IcoRocketFuel contract', async (accounts) => {
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  let icoRocketFuel;
  let owner = accounts[0];
  let commissionWallet = accounts[1];
  let notOwner = accounts[2];

  before(async function () {
  });

  beforeEach(async () => {
    icoRocketFuel = await IcoRocketFuel.new({from: owner});
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
    assert.equal(actualCommissionWallet, ZERO_ADDR,
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
    assert.equal(actualCommissionWallet, ZERO_ADDR,
      'Address of default commission wallet is not 0x0.');
  });
})