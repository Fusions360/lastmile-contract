pragma solidity ^0.4.24;


/**
 * @title KYC contract interface
 */
contract KYC {
    
    /**
     * Get KYC expiration timestamp in second.
     *
     * @param _who Account address
     * @return KYC expiration timestamp in second
     */
    function expireOf(address _who) external view returns (uint256);

    /**
     * Get KYC level.
     * Level is ranging from 0 (lowest, no KYC) to 255 (highest, toughest).
     *
     * @param _who Account address
     * @return KYC level
     */
    function kycLevelOf(address _who) external view returns (uint8);

    /**
     * Get encoded nationalities (country list).
     * The uint256 is represented by 256 bits (0 or 1).
     * Every bit can represent a country.
     * For each listed country, set the corresponding bit to 1.
     * To do so, up to 256 countries can be encoded in an uint256 variable.
     * Further, if country blacklist of an ICO was encoded by the same way,
     * it is able to use bitwise AND to check whether the investor can invest
     * the ICO by the crowdsale.
     *
     * @param _who Account address
     * @return Encoded nationalities
     */
    function nationalitiesOf(address _who) external view returns (uint256);

    /**
     * Set KYC status to specific account address.
     *
     * @param _who Account address
     * @param _expiresAt Expire timestamp in seconds
     * @param _level KYC level
     * @param _nationalities Encoded nationalities
     */
    function setKYC(
        address _who, uint256 _expiresAt, uint8 _level, uint256 _nationalities) 
        external;

    event KYCSet (
        address indexed _setter,
        address indexed _who,
        uint256 _expiresAt,
        uint8 _level,
        uint256 _nationalities
    );
}