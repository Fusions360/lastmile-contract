const BigNumber = web3.BigNumber;
const FusionsKYC = artifacts.require('FusionsKYC');
const CurrencyExchangeRate = artifacts.require('CurrencyExchangeRate');
const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test startCrowdsale() of IcoRocketFuel contract', async (accounts) => {

    let fusKyc;
    let exRate;
    let main;

    let token;

    const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
    let admin = accounts[0];
    let icoTeam = accounts[1];

    let now = Math.floor((new Date).getTime()/1000);

    // Natural persons
    let npTW = accounts[2];
    let npUS = accounts[3];
    let npSG_TW = accounts[4];

    // Legal persons
    let lpUS = accounts[5];

    beforeEach(async () => {
        // Deploy contract
        fusKyc = await FusionsKYC.new({from: admin});
        exRate = await CurrencyExchangeRate.new({from: admin});
        main = await IcoRocketFuel.new({from: admin});
        token = await MintableToken.new({from: icoTeam});
        await main.setAddress(token.address, icoTeam, admin, 
            exRate.address, fusKyc.address, {from: admin});

        // Initiate natural/legal person
        fusKyc.setKYC(npTW, now + 1000, 100, "862718293348820473429344482784628181556388621521298319395315527974912");
        fusKyc.setKYC(npUS, now + 1000, 100, "27606985387162255149739023449108101809804435888681546220650096895197184");
        fusKyc.setKYC(npSG_TW, now + 1000, 100, "862718294152289495558839620555609227726969922782399816286711945625600");
        fusKyc.setKYC(lpUS, now + 1000, 200, "27606985387162255149739023449108101809804435888681546220650096895197184");
    
        let balance = await web3.eth.getBalance(npTW);
    });

    it('should start crowdsale', async function () {
        await main.startCrowdsale({from: icoTeam});
    });

    it('should not start crowdsale', async function () {
        let thrown = false;
        try {
            await main.startCrowdsale({from: admin});
        } catch (e) {
            thrown = true;
        }
        assert.isTrue(thrown);
    });
})