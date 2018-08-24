pragma solidity ^0.4.24;

import "./KYC.sol";
import "./Ownable.sol";


/**
 * @title Fusions KYC contract
 */
contract FusionsKYC is KYC, Ownable {

    struct KYCStatus {
        uint256 expires;
        uint8 kycLevel;
        uint256 nationalities;
    }

    mapping(address => KYCStatus) public kycStatuses;

    function expireOf(address _who) 
        external view returns (uint256)
    {
        return kycStatuses[_who].expires;
    }

    function kycLevelOf(address _who)
        external view returns (uint8)
    {
        return kycStatuses[_who].kycLevel;
    }

    function nationalitiesOf(address _who) 
        external view returns (uint256)
    {
        return kycStatuses[_who].nationalities;
    }    
    
    function setKYC(
        address _who, 
        uint256 _expiresAt,
        uint8 _level,
        uint256 _nationalities
    )
        external
        onlyOwner
    {
        require(
            _who != address(0),
            "Failed to set expiration due to address is 0x0."
        );

        emit KYCSet(
            msg.sender,
            _who,
            _expiresAt,
            _level,
            _nationalities
        );

        kycStatuses[_who].expires = _expiresAt;
        kycStatuses[_who].kycLevel = _level;
        kycStatuses[_who].nationalities = _nationalities;
    }
}