pragma solidity ^0.4.24;


/**
 * @title Crowdsale controller contract interface
 */
contract CrowdsaleController {

    /**
     * Get approval status of token crowdsale.
     * 
     * @param _token Token address represents a crowdsale
     * @return True: approved; False: not yet approved
     */
    function approvedOf(address _token) external view returns (bool);

    /**
     * Get required KYC level of the crowdsale.
     * KYC level = 0 (default): Crowdsale does not require KYC.
     * KYC level > 0: Crowdsale requires centain level of KYC.
     * KYC level ranges from 0 (no KYC) to 255 (toughest).
     *
     * @param _token Token address represents a crowdsale
     * @return Required KYC level of the crowdsale
     */
    function kycLevelOf(address _token) external view returns (uint8);
    
    /**
     * Get encoded country blacklist.
     * The uint256 is represented by 256 bits (0 or 1).
     * Every bit can represent a country.
     * For the country listed in the blacklist, set the corresponding bit to 1.
     * To do so, up to 256 countries can be encoded in an uint256 variable.
     * Further, if nationalities of an investor were encoded by the same way,
     * it is able to use bitwise AND to check whether the investor can invest
     * the ICO by the crowdsale.
     *
     * @param _token Token address represents a crowdsale
     * @return Encoded country blacklist
     */
    function countryBlacklistOf(address _token) 
        external view returns (uint256);

    /**
     * Approve a crowdsale with investment restrictions.
     *
     * @param _token Token address represents a crowdsale
     * @param _kycLevel Required KYC level of the crowdsale
     * @param _countryBlacklist Encoded country blacklist
     */
    function approveCrowdsale(
        address _token, uint8 _kycLevel, uint256 _countryBlacklist) external;

    /**
     * Set investment restrictions.
     *
     * @param _token Token address represents a crowdsale
     * @param _kycLevel Required KYC level of the crowdsale
     * @param _countryBlacklist Encoded country blacklist
     */
    function setInvestmentRestrictions(
        address _token, uint8 _kycLevel, uint256 _countryBlacklist) external;

    event CrowdsaleApproved (
        address indexed _approver,
        address indexed _token,
        bool _approved,
        uint8 _kycLevel,
        uint256 _countryBlacklist
    );

    event InvestmentRestrictionsSet (
        address indexed _approver,
        address indexed _token,
        uint8 _kycLevel,
        uint256 _countryBlacklist
    );
}