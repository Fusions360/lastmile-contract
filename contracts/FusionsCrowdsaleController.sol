pragma solidity ^0.4.24;

import "./CrowdsaleController.sol";
import "./Ownable.sol";


/**
 * @title Fusions crowdsale controller contract
 */
contract FusionsCrowdsaleController is CrowdsaleController, Ownable {

    struct CrowdsaleStatus {
        bool approved;
        uint8 kycLevel;
        uint256 countryBlacklist;
    }

    mapping(address => CrowdsaleStatus) public crowdsaleStatuses;

    function approvedOf(address _token) 
        external view returns (bool)
    {
        return crowdsaleStatuses[_token].approved;
    }

    function kycLevelOf(address _token)
        external view returns (uint8)
    {
        return crowdsaleStatuses[_token].kycLevel;
    }

    function countryBlacklistOf(address _token)
        external view returns (uint256)
    {
        return crowdsaleStatuses[_token].countryBlacklist;
    }

    function approveCrowdsale(
        address _token,
        uint8 _kycLevel,
        uint256 _countryBlacklist
    )
        external
        onlyOwner
    {
        require(
            _token != address(0),
            "Failed to approve crowdsale due to address is 0x0."
        );

        require(
            !crowdsaleStatuses[_token].approved,
            "Failed to approve crowdsale due to it was approved."
        );

        emit CrowdsaleApproved(
            msg.sender,
            _token,
            true,
            _kycLevel,
            _countryBlacklist
        );

        crowdsaleStatuses[_token] = CrowdsaleStatus({
            approved: true,
            kycLevel: _kycLevel,
            countryBlacklist: _countryBlacklist
        });
    }

    function setInvestmentRestrictions(
        address _token,
        uint8 _kycLevel,
        uint256 _countryBlacklist
    )
        external
        onlyOwner
    {
        require(
            _token != address(0),
            "Failed to set investment restrictions due to address is 0x0."
        );

        require(
            crowdsaleStatuses[_token].approved,
            "Failed to set investment restrictions due to no approval."
        );

        emit InvestmentRestrictionsSet(
            msg.sender,
            _token,
            _kycLevel,
            _countryBlacklist
        );

        crowdsaleStatuses[_token].kycLevel = _kycLevel;
        crowdsaleStatuses[_token].countryBlacklist = _countryBlacklist;
    }
}