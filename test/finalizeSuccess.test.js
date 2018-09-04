const BigNumber = web3.BigNumber;
const FusionsKYC = artifacts.require('FusionsKYC');
const CurrencyExchangeRate = artifacts.require('CurrencyExchangeRate');
const IcoRocketFuel = artifacts.require('IcoRocketFuel');
const MintableToken = artifacts.require('MintableToken');

contract('Test finalize(): success, USD', async (accounts) => {

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
        let cap = new BigNumber(5000000 * (10**18)); // 5,000,000 USD
        let goal = new BigNumber(5000 * (10**18)); // 50,000 USD
        let minInvest = new BigNumber(3000 * (10**18)); // 25000 USD
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
    });

    it('should finalize (success)', async function () {
        await main.startCrowdsale({from: icoTeam});
        let commission = await main.commission();
        commission = commission.div(100);

        let value = new BigNumber(10 * (10**18));
        // await main.buyToken({value: value, from: icoTeam});
        await main.buyToken({value: value, from: npTW});
        // await main.buyToken({value: value, from: npUS});
        // await main.buyToken({value: value, from: npSG_TW});
        await main.buyToken({value: value, from: lpUS});
        await main.buyToken({value: value, from: lpUS});

        // Check invest size in currency
        let investSize = await main.raised();
        console.log(investSize.toNumber());

        // Check invest size in currency
        let tokenUnits = await main.totalTokenUnits();
        console.log(tokenUnits.toNumber());

        // Prepare token units to perform the deal.
        let surplus = new BigNumber(5 * 10**18);
        await token.mint(main.address, 
            tokenUnits.add(surplus), {from: icoTeam});

        // Raised wei were entrusted in vault.
        let vault = await main.vault();
        let raisedWei = await web3.eth.getBalance(vault);
        
        // Log previous balances
        let icoTeamPreBal = await web3.eth.getBalance(icoTeam);
        let adminPreBal = await web3.eth.getBalance(admin);

        // Verify ICO team balance
        let receipt = await main.finalize({from: icoTeam});
        let tx = await web3.eth.getTransaction(receipt.tx);
        let icoTeamBal = await web3.eth.getBalance(icoTeam);
        assert.equal(icoTeamBal.toNumber(), icoTeamPreBal
            .sub(receipt.receipt.gasUsed * tx.gasPrice)
            .add(raisedWei.mul(new BigNumber(1).sub(commission)))
            .toNumber(), 'ICO team balance is incorrect.');
        
        // Verify Admin balance
        let adminBal = await web3.eth.getBalance(admin);
        assert.equal(adminBal.toNumber(), adminPreBal
            .add(raisedWei.mul(commission)).toNumber(), 
            'Admin balance is incorrect.');
        
        // Verify surplus token units refunded to ICO team
        let icoTeamTokenBal = await token.balanceOf(icoTeam);
        assert.equal(icoTeamTokenBal.toNumber(), surplus.toNumber(),
            'ICO team token balance is incorrect.');

        // Verify claimed token units of Taiwan natual person (npTW)
        let npTWToken = await main.tokenUnits(npTW);
        await main.claimToken({from: npTW});
        let npTWTokenBal = await token.balanceOf(npTW);
        console.log(npTWTokenBal.toString());
        assert.equal(npTWToken.toNumber(), npTWTokenBal.toNumber(),
            'NP TW token balance is incorrect.');

        // Verify claimed token units of US legal person (lpUS)
        let lpUSToken = await main.tokenUnits(lpUS);
        await main.claimToken({from: lpUS});
        let lpUSTokenBal = await token.balanceOf(lpUS);
        console.log(lpUSTokenBal.toString());
        assert.equal(lpUSToken.toNumber(), lpUSTokenBal.toNumber(),
            'LP US token balance is incorrect.');
    });
})