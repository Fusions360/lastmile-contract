pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./SafeMath.sol";


contract EtherVault is Ownable {
    using SafeMath for uint256;

    enum State { Active, Refunding, Closed }

    address public wallet;
    State public state;

    event Closed(address indexed commissionWallet, uint256 commission);
    event RefundsEnabled();
    event Refunded(address indexed beneficiary, uint256 weiAmount);

    constructor(address _wallet) public {
        require(
            _wallet != address(0),
            "Failed to create Ether vault due to wallet address is 0x0."
        );
        wallet = _wallet;
        state = State.Active;
    }

    function deposit() public onlyOwner payable {
        require(
            state == State.Active,
            "Failed to deposit Ether due to state is not Active."
        );
    }

    function close(address _commissionWallet, uint256 _commission) public onlyOwner {
        require(
            state == State.Active,
            "Failed to close due to state is not Active."
        );
        state = State.Closed;
        emit Closed(_commissionWallet, _commission);
        _commissionWallet.transfer(address(this).balance.mul(_commission).div(100));
        wallet.transfer(address(this).balance);
    }

    function enableRefunds() public onlyOwner {
        require(
            state == State.Active,
            "Failed to enable refunds due to state is not Active."
        );
        emit RefundsEnabled();
        state = State.Refunding;        
    }

    function refund(address investor, uint256 depositedValue) public onlyOwner {
        require(
            state == State.Refunding,
            "Failed to refund due to state is not Refunding."
        );
        emit Refunded(investor, depositedValue);
        investor.transfer(depositedValue);        
    }
}
