const BigNumber = web3.BigNumber;
const FusionsKYC = artifacts.require('FusionsKYC');
const CurrencyExchangeRate = artifacts.require('CurrencyExchangeRate');
const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test finalize(): error', async (accounts) => {

    let fusKyc;
    let exRate;
    let main;

    let token;

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

        // Set special offer
        let currency = new BigNumber(1); // Use USD
        let cap = new BigNumber(5000000); // 5,000,000 USD
        let goal = new BigNumber(5000); // 50,000 USD
        let minInvest = new BigNumber(3000); // 25000 USD
        let closingTime = now + 1000;
        await main.setSpecialOffer(currency, cap, goal, minInvest, 
            closingTime, {from: admin});

        // Set invest restriction
        let countryBlacklist = "27606985387965724171868518586879082855975017189942647717541493312847872";
        let kycLevel = 100;
        let legalPersonSkipsCountryCheck = true;
        await main.setInvestRestriction(countryBlacklist, kycLevel, 
            legalPersonSkipsCountryCheck, {from: admin});
    });

    it('should not finalize', async function () {       
        await main.startCrowdsale({from: icoTeam});
        let thrown = false;
        try {
            // Only ICO Team can finalize.
            await main.finalize({from: admin});
        } catch (e) {
            thrown = true;
        }
        assert.isTrue(thrown);
    });
})