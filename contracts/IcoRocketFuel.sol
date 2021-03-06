pragma solidity ^0.4.24;

import "./KYC.sol";
import "./ERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";
import "./EtherVault.sol";
import "./CurrencyExchangeRate.sol";

/**
 * @title ICO Rocket Fuel contract for FirstMile/LastMile service.
 */
contract IcoRocketFuel is Ownable {
    using SafeMath for uint256;

    // Crowdsale current state
    enum States {Ready, Active, Paused, Refunding, Closed}
    States public state = States.Ready;

    // Token for crowdsale (Token contract).
    // Replace 0x0 by deployed ERC20 token address.
    ERC20 public token = ERC20(0x0);

    // Crowdsale owner (ICO team).
    // Replace 0x0 by wallet address of ICO team.
    address public crowdsaleOwner = 0x0;

    // When crowdsale is closed, commissions will transfer to this wallet.
    // Replace 0x0 by commission wallet address of platform.
    address public commissionWallet = 0x0;

    // Base exchange rate (1 invested currency = N tokens) and its decimals.
    // Ex. to present base exchange rate = 0.01 (= 1 / (10^2))
    //     baseExRate = 1; baseExRateDecimals = 2 
    //     (1 / (10^2)) equal to (baseExRate / (10^baseExRateDecimals))
    uint256 public baseExRate = 20;    
    uint8 public baseExRateDecimals = 0;

    // External exchange rate contract and currency index.
    // Use exRate.currencies(currency) to get tuple.
    // tuple = (Exchange rate to Ether, Exchange rate decimal)
    // Replace 0x0 by address of deployed CurrencyExchangeRate contract.
    CurrencyExchangeRate public exRate = CurrencyExchangeRate(0x0);
    // Supported currency
    // 0: Ether
    // 1: USD
    uint256 public currency = 1;

    // Total raised in specified currency.
    uint256 public raised = 0;
    // Hard cap in specified currency.
    uint256 public cap = 10000 * (10**18);
    // Soft cap in specified currency.
    uint256 public goal = 1000 * (10**18);
    // Minimum investment in specified currency.
    uint256 public minInvest = 500 * (10**18);
    
    // Crowdsale closing time in second.
    uint256 public closingTime = 1538352000;
    // Whether allow early closure
    bool public earlyClosure = true;

    // Commission percentage. Set to 10 means 10% 
    uint8 public commission = 10;

    // When KYC is required, check KYC result with this contract.
    // The value is initiated by constructor.
    // The value is not allowed to change after contract deployment.
    // Replace 0x0 by address of deployed KYC contract.
    KYC public kyc = KYC(0x0);

    // Get encoded country blacklist.
    // The uint256 is represented by 256 bits (0 or 1).
    // Every bit can represent a country.
    // For the country listed in the blacklist, set the corresponding bit to 1.
    // To do so, up to 256 countries can be encoded in an uint256 variable.
    // Further, if nationalities of an investor were encoded by the same way,
    // it is able to use bitwise AND to check whether the investor can invest
    // the ICO by the crowdsale.
    uint256 public countryBlacklist = 0;

    // Get required KYC level of the crowdsale.
    // KYC level = 0 (default): Crowdsale does not require KYC.
    // KYC level > 0: Crowdsale requires centain level of KYC.
    // KYC level ranges from 0 (no KYC) to 255 (toughest).
    uint8 public kycLevel = 0;

    // Whether legal person can skip country check.
    // True: can skip; False: cannot skip.  
    bool public legalPersonSkipsCountryCheck = true;

    // Use deposits[buyer] to get deposited Wei for buying the token.
    // The buyer is the buyer address.
    mapping(address => uint256) public deposits;
    // Ether vault entrusts invested Wei.
    EtherVault public vault;
    
    // Investment in specified currency.
    // Use invests[buyer] to get current investments.
    mapping(address => uint256) public invests;
    // Token units can be claimed by buyer.
    // Use tokenUnits[buyer] to get current bought token units.
    mapping(address => uint256) public tokenUnits;
    // Total token units for performing the deal.
    // Sum of all buyers' bought token units will equal to this value.
    uint256 public totalTokenUnits = 0;

    // Bonus tiers which will be initiated in constructor.
    struct BonusTier {
        uint256 investSize; // Invest in specified currency
        uint256 bonus;      // Bonus in percentage
    }
    // Bonus levels initiated by constructor.
    BonusTier[] public bonusTiers;

    event StateSet(
        address indexed setter, 
        States oldState, 
        States newState
    );

    event CrowdsaleStarted(
        address indexed icoTeam
    );

    event TokenBought(
        address indexed buyer, 
        uint256 valueWei, 
        uint256 valueCurrency
    );

    event TokensRefunded(
        address indexed beneficiary,
        uint256 valueTokenUnit
    );

    event Finalized(
        address indexed icoTeam
    );

    event SurplusTokensRefunded(
        address indexed beneficiary,
        uint256 valueTokenUnit
    );

    event CrowdsaleStopped(
        address indexed owner
    );

    event TokenClaimed(
        address indexed beneficiary,
        uint256 valueTokenUnit
    );

    event RefundClaimed(
        address indexed beneficiary,
        uint256 valueWei
    );

    modifier onlyCrowdsaleOwner() {
        require(
            msg.sender == crowdsaleOwner,
            "Failed to call function due to permission denied."
        );
        _;
    }

    modifier inState(States _state) {
        require(
            state == _state,
            "Failed to call function due to crowdsale is not in right state."
        );
        _;
    }

    modifier nonZeroAddress(address _token) {
        require(
            _token != address(0),
            "Failed to call function due to address is 0x0."
        );
        _;
    }

    constructor() public {
        // Must push higher bonus first.
        bonusTiers.push(
            BonusTier({
                investSize: 6000 * (10**18),
                bonus: 50
            })
        );
        bonusTiers.push(
            BonusTier({
                investSize: 4000 * (10**18),
                bonus: 40
            })
        );
        bonusTiers.push(
            BonusTier({
                investSize: 2000 * (10**18),
                bonus: 30
            })
        );
    }

    function setAddress(
        address _token,
        address _crowdsaleOwner,
        address _commissionWallet,
        address _exRate,
        address _kyc
    ) external onlyOwner inState(States.Ready){
        token = ERC20(_token);
        crowdsaleOwner = _crowdsaleOwner;
        commissionWallet = _commissionWallet;
        exRate = CurrencyExchangeRate(_exRate);
        kyc = KYC(_kyc);
    }

    function setSpecialOffer(
        uint256 _currency,
        uint256 _cap,
        uint256 _goal,
        uint256 _minInvest,
        uint256 _closingTime
    ) external onlyOwner inState(States.Ready) {
        currency = _currency;
        cap = _cap;
        goal = _goal;
        minInvest = _minInvest;
        closingTime = _closingTime;
    }

    function setInvestRestriction(
        uint256 _countryBlacklist,
        uint8 _kycLevel,
        bool _legalPersonSkipsCountryCheck
    ) external onlyOwner inState(States.Ready) {
        countryBlacklist = _countryBlacklist;
        kycLevel = _kycLevel;
        legalPersonSkipsCountryCheck = _legalPersonSkipsCountryCheck;
    }

    function setState(uint256 _state) external onlyOwner {
        require(
            uint256(state) < uint256(States.Refunding),
            "Failed to set state due to crowdsale was finalized."
        );
        require(
            // Only allow switch state between Active and Paused.
            uint256(States.Active) == _state || uint256(States.Paused) == _state,
            "Failed to set state due to invalid index."
        );
        emit StateSet(msg.sender, state, States(_state));
        state = States(_state);
    }

    /**
     * Get bonus in token units.
     * @param _investSize Total investment size in specified currency
     * @param _tokenUnits Token units for the investment (without bonus)
     * @return Bonus in token units
     */
    function _getBonus(uint256 _investSize, uint256 _tokenUnits) 
        private view returns (uint256) 
    {
        for (uint256 _i = 0; _i < bonusTiers.length; _i++) {
            if (_investSize >= bonusTiers[_i].investSize) {
                return _tokenUnits.mul(bonusTiers[_i].bonus).div(100);
            }
        }
        return 0;
    }

    /**
     * Start crowdsale.
     */
    function startCrowdsale()
        external
        onlyCrowdsaleOwner
        inState(States.Ready)
    {
        emit CrowdsaleStarted(msg.sender);
        vault = new EtherVault(msg.sender);
        state = States.Active;
    }

    /**
     * Buy token.
     */
    function buyToken()
        external
        inState(States.Active)
        payable
    {
        // KYC level = 0 means no KYC can invest.
        // KYC level > 0 means certain level of KYC is required.
        if (kycLevel > 0) {
            require(
                // solium-disable-next-line security/no-block-members
                block.timestamp < kyc.expireOf(msg.sender),
                "Failed to buy token due to KYC was expired."
            );
        }

        require(
            kycLevel <= kyc.kycLevelOf(msg.sender),
            "Failed to buy token due to require higher KYC level."
        );

        require(
            countryBlacklist & kyc.nationalitiesOf(msg.sender) == 0 || (
                kyc.kycLevelOf(msg.sender) >= 200 && legalPersonSkipsCountryCheck
            ),
            "Failed to buy token due to country investment restriction."
        );

        // Get exchange rate of specified currency.
        (uint256 _exRate, uint8 _exRateDecimals) = exRate.currencies(currency);

        // Convert from Ether to base currency.
        uint256 _investSize = (msg.value)
            .mul(_exRate).div(10**uint256(_exRateDecimals));

        require(
            _investSize >= minInvest,
            "Failed to buy token due to less than minimum investment."
        );

        require(
            raised.add(_investSize) <= cap,
            "Failed to buy token due to exceed cap."
        );

        require(
            // solium-disable-next-line security/no-block-members
            block.timestamp < closingTime,
            "Failed to buy token due to crowdsale is closed."
        );

        // Update total invested in specified currency.
        invests[msg.sender] = invests[msg.sender].add(_investSize);
        // Update total invested wei.
        deposits[msg.sender] = deposits[msg.sender].add(msg.value);
        // Update total raised in specified currency.    
        raised = raised.add(_investSize);

        // Log previous token units.
        uint256 _previousTokenUnits = tokenUnits[msg.sender];

        // Calculate token units by base exchange rate.
        uint256 _tokenUnits = invests[msg.sender]
            .mul(baseExRate)
            .div(10**uint256(baseExRateDecimals));

        // Calculate bought token units (take bonus into account).
        uint256 _tokenUnitsWithBonus = _tokenUnits.add(
            _getBonus(invests[msg.sender], _tokenUnits));

        // Update total bought token units.
        tokenUnits[msg.sender] = _tokenUnitsWithBonus;

        // Update total token units to be issued.
        totalTokenUnits = totalTokenUnits
            .sub(_previousTokenUnits)
            .add(_tokenUnitsWithBonus);

        emit TokenBought(msg.sender, msg.value, _investSize);

        // Entrust wei to vault.
        vault.deposit.value(msg.value)();
    }

    /**
     * Refund token units to wallet address of crowdsale owner.
     */
    function _refundTokens()
        private
        inState(States.Refunding)
    {
        uint256 _value = token.balanceOf(address(this));
        emit TokensRefunded(crowdsaleOwner, _value);
        if (_value > 0) {         
            // Refund all tokens for crowdsale to refund wallet.
            token.transfer(crowdsaleOwner, _value);
        }
    }

    /**
     * Finalize this crowdsale.
     */
    function finalize()
        external
        inState(States.Active)        
        onlyCrowdsaleOwner
    {
        require(
            // solium-disable-next-line security/no-block-members                
            earlyClosure || block.timestamp >= closingTime,                   
            "Failed to finalize due to crowdsale is opening."
        );

        emit Finalized(msg.sender);

        if (raised >= goal && token.balanceOf(address(this)) >= totalTokenUnits) {
            // Set state to Closed whiling preventing reentry.
            state = States.Closed;

            // Refund surplus tokens.
            uint256 _balance = token.balanceOf(address(this));
            uint256 _surplus = _balance.sub(totalTokenUnits);
            emit SurplusTokensRefunded(crowdsaleOwner, _surplus);
            if (_surplus > 0) {
                // Refund surplus tokens to refund wallet.
                token.transfer(crowdsaleOwner, _surplus);
            }
            // Close vault, and transfer commission and raised ether.
            vault.close(commissionWallet, commission);
        } else {
            state = States.Refunding;
            _refundTokens();
            vault.enableRefunds();
        }
    }

    /**
     * Stop this crowdsale.
     * Only stop suspecious projects.
     */
    function stopCrowdsale()  
        external
        onlyOwner
        inState(States.Paused)
    {
        emit CrowdsaleStopped(msg.sender);
        state = States.Refunding;
        _refundTokens();
        vault.enableRefunds();
    }

    /**
     * Investors claim bought token units.
     */
    function claimToken()
        external 
        inState(States.Closed)
    {
        require(
            tokenUnits[msg.sender] > 0,
            "Failed to claim token due to token unit is 0."
        );
        uint256 _value = tokenUnits[msg.sender];
        tokenUnits[msg.sender] = 0;
        emit TokenClaimed(msg.sender, _value);
        token.transfer(msg.sender, _value);
    }

    /**
     * Investors claim invested Ether refunds.
     */
    function claimRefund()
        external
        inState(States.Refunding)
    {
        require(
            deposits[msg.sender] > 0,
            "Failed to claim refund due to deposit is 0."
        );

        uint256 _value = deposits[msg.sender];
        deposits[msg.sender] = 0;
        emit RefundClaimed(msg.sender, _value);
        vault.refund(msg.sender, _value);
    }
}