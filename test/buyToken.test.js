const BigNumber = web3.BigNumber;
const FusionsKYC = artifacts.require('FusionsKYC');
const CurrencyExchangeRate = artifacts.require('CurrencyExchangeRate');
const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test buyToken() of IcoRocketFuel contract', async (accounts) => {

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
    });

    it('should buy token (USD)', async function () {
        // Set special offer
        let currency = new BigNumber(1); // Use USD
        let cap = new BigNumber(5000000 * (10**18)); // 5,000,000 USD
        let goal = new BigNumber(1000000 * (10**18)); // 1,000,000 USD
        let minInvest = new BigNumber(25000 * (10**18)); // 25,000 USD
        let closingTime = now + 1000;
        await main.setSpecialOffer(currency, cap, goal, minInvest, 
            closingTime, {from: admin});

        // Set invest restriction
        // US and Singapore cannot invest
        let countryBlacklist = "27606985387965724171868518586879082855975017189942647717541493312847872";
        let kycLevel = 100;
        let legalPersonSkipsCountryCheck = true;
        await main.setInvestRestriction(countryBlacklist, kycLevel, 
            legalPersonSkipsCountryCheck, {from: admin});

        await main.startCrowdsale({from: icoTeam});

        let value = new BigNumber(90 * (10**18));
        // await main.buyToken({value: value, from: icoTeam});
        await main.buyToken({value: value, from: npTW});
        // await main.buyToken({value: value, from: npUS});
        // await main.buyToken({value: value, from: npSG_TW});
        await main.buyToken({value: value, from: lpUS});

        // Check vault balance
        let vault = await main.vault();
        let balance = await web3.eth.getBalance(vault);
        console.log(balance.toNumber());

        // Check invest size in currency
        let investSize = await main.raised();
        console.log(investSize.toNumber()); 
    });

    it('should buy token (ETH)', async function () {
        // Set special offer
        let currency = new BigNumber(0); // Use ETH
        let cap = new BigNumber(100 * (10**18)); // 100 ETH
        let goal = new BigNumber(10 * (10**18)); // 10 ETH
        let minInvest = new BigNumber(2 * (10**18)); // 2 ETH
        let closingTime = now + 1000;
        await main.setSpecialOffer(currency, cap, goal, minInvest, 
            closingTime, {from: admin});

        // Set invest restriction
        // US and Singapore cannot invest
        let countryBlacklist = "27606985387965724171868518586879082855975017189942647717541493312847872";
        let kycLevel = 100;
        let legalPersonSkipsCountryCheck = true;
        await main.setInvestRestriction(countryBlacklist, kycLevel, 
            legalPersonSkipsCountryCheck, {from: admin});

        await main.startCrowdsale({from: icoTeam});

        let value = new BigNumber(2 * (10**18));
        // await main.buyToken({value: value, from: icoTeam});
        await main.buyToken({value: value, from: npTW});
        // await main.buyToken({value: value, from: npUS});
        // await main.buyToken({value: value, from: npSG_TW});
        await main.buyToken({value: value, from: lpUS});

        // Check vault balance
        let vault = await main.vault();
        let balance = await web3.eth.getBalance(vault);
        console.log(balance.toNumber());

        // Check invest size in currency
        let investSize = await main.raised();
        console.log(investSize.toNumber()); 
    });
})