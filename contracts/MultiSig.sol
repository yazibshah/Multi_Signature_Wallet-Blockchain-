// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract MultiSig{
    address[] public owners;
    uint256 public numberOfConfirmationRequired;

    struct Transaction{
        address to;
        uint value;
        bool executed;
    }

    mapping(uint=>mapping (address=>bool)) isConfirmed;
    Transaction[] public transactions;

    event TransactionSubmitted(uint transactionId , address sender, address reciever , uint amount);
    event TransactionConfirmed(uint transactionId);
    event TrasactionExecuted(uint transactionId);

    constructor(address[] memory _owner, uint _numberOfConfirmationRequired){
        require(_owner.length>1 ,"Owners Required Must be greater than 1");
        require(_numberOfConfirmationRequired>0 && _numberOfConfirmationRequired <= _owner.length , "Number of Confirmation are not in sync with the number of owners" );

        for(uint i=0 ; i<_owner.length;  i++){
            require(_owner[i] != address(0),"Invalid owner");
            owners.push(_owner[i]);
        }
        numberOfConfirmationRequired=_numberOfConfirmationRequired;
    }
    
    function submitTransaction(address _to) public payable {
            require(_to != address(0),"Invalid Reciever Address");
            require(msg.value>0, "Transferred Amount Must be greater than 0");
            uint transactionId= transactions.length;
            transactions.push(Transaction(_to,msg.value, false));
            emit TransactionSubmitted(transactionId, msg.sender, _to, msg.value);

            
    }

    function executeTransaction(uint _transactionId) internal   {
        require(_transactionId<transactions.length,"Invalid Trabsaction Id");
        require(!transactions[_transactionId].executed,"Transaction is already executed");
        (bool success,)=transactions[_transactionId].to.call{value:transactions[_transactionId].value}("");
        require(success,"Transaction is failed");
        transactions[_transactionId].executed=true;
        emit TrasactionExecuted(_transactionId);
    }
    function confirmTransaction(uint _transactionId) public{
        require(_transactionId<transactions.length,"Invalid Trabsaction Id");    
        require(!isConfirmed[_transactionId][msg.sender],"Transaction is already confirmed by the owners");
        isConfirmed[_transactionId][msg.sender]=true;
        emit TransactionConfirmed(_transactionId);

        if(isTransactionConfirmed(_transactionId)){
             executeTransaction(_transactionId);
        }

    }

    function isTransactionConfirmed(uint _transactionId) public view returns(bool){
        require(_transactionId<transactions.length,"Invalid Transaction Id");    
        uint confirmationCount;

        for(uint i=0; i<owners.length;i++){
            if(isConfirmed[_transactionId][owners[i]]){
                confirmationCount++;
            }
        }
        return  confirmationCount >= numberOfConfirmationRequired;
    }
}