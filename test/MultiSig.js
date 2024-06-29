const { expect } = require("chai");
const {ethers} = require("hardhat")
describe("MultiSignatureWallet", function () {
  let multiSig;
  let MultiSigFactory;
  let owner1;
  let owner2;
  let owner3;
  let owners;

  beforeEach(async function () {
    [owner1, owner2, owner3] = await ethers.getSigners();
    owners = [owner1.address, owner2.address, owner3.address];
    const numberOfConfirmationRequired = 2;

     MultiSigFactory = await ethers.getContractFactory("MultiSig");
     multiSig = await MultiSigFactory.deploy(owners, numberOfConfirmationRequired);

    // multiSig=await ethers.deployContract("MultiSig")(owners,numberOfConfirmationRequired);
  });

  describe("Constructor Check",async()=>{
    it("Should reverrt if owner is less then 1",async()=>{
      await expect(MultiSigFactory.deploy([owner1.address],2)).to.be.revertedWith("Owners Required Must be greater than 1");
    })
    
    it("NumberOfConfirmationRequired should be 2 and Owners",async()=>{
      await expect(await multiSig.numberOfConfirmationRequired()).to.equal(2);
      await expect(await multiSig.owners(0)).to.equal(owner1.address);
      await expect(await multiSig.owners(1)).to.equal(owner2.address);
      await expect(await multiSig.owners(2)).to.equal(owner3.address);
    })

    it("Should reverrt onwers length and NumberOfConfirmationRequired are not sync",async()=>{
      await expect(MultiSigFactory.deploy(owners,0)).to.be.revertedWith("Number of Confirmation are not in sync with the number of owners");
      await expect(MultiSigFactory.deploy(owners, 4)).to.be.revertedWith("Number of Confirmation are not in sync with the number of owners");
    })
    
  })

  describe("submit Transaction", function () {
    it("should revert transaction if address in none", async function () {
    await expect(multiSig.connect(owner1).submitTransaction(ethers.ZeroAddress, { value: ethers.parseEther("1.0") })).to.be.revertedWith("Invalid Reciever Address");    
    });

    it("should revert if transferred amount is zero", async function () {
      await expect(multiSig.connect(owner1).submitTransaction(owner2.address, { value: ethers.parseEther("0") }))
        .to.be.revertedWith("Transferred Amount Must be greater than 0");
    });

    it("should execute transaction after required confirmations", async function () {
      // Submit transaction
      await multiSig.connect(owner1).submitTransaction(owner2.address, { value: ethers.parseEther("1.0") });
      // Confirm transaction
      await multiSig.connect(owner1).confirmTransaction(0);
      await multiSig.connect(owner2).confirmTransaction(0);
      // Check execution
      const transaction = await multiSig.transactions(0);
      expect(transaction.executed).to.be.true;
    });


    //  Have to start from here again
    it("should prevent re-confirmation of a transaction by the same owner", async function () {
      // Submit transaction
      await multiSig.connect(owner1).submitTransaction(owner2.address, { value: ethers.utils.parseEther("1.0") });

      // Confirm transaction
      await multiSig.connect(owner1).confirmTransaction(0);
      
      // Attempt to re-confirm
      await expect(multiSig.connect(owner1).confirmTransaction(0)).to.be.revertedWith("Transaction is already confirmed by the owner");
    });

    it("should not allow non-owner to submit transaction", async function () {
      await expect(
        multiSig.connect(owner1).submitTransaction(owner1.address, { value: ethers.utils.parseEther("1.0") })
      ).to.be.revertedWith("Caller is not owner");
    });

    it("should not allow non-owner to confirm transaction", async function () {
      // Submit transaction
      await multiSig.connect(owner1).submitTransaction(owner2.address, { value: ethers.utils.parseEther("1.0") });

      // Attempt to confirm as non-owner
      await expect(multiSig.connect(owner3).confirmTransaction(0)).to.be.revertedWith("Caller is not owner");
    });

    it("should not execute transaction without enough confirmations", async function () {
      // Submit transaction
      await multiSig.connect(owner1).submitTransaction(owner2.address, { value: ethers.utils.parseEther("1.0") });

      // Confirm transaction only once
      await multiSig.connect(owner1).confirmTransaction(0);

      // Check execution
      const transaction = await multiSig.transactions(0);
      expect(transaction.executed).to.be.false;
    });

    it("should not allow execution of a non-existing transaction", async function () {
      await expect(multiSig.executeTransaction(9999)).to.be.revertedWith("Invalid Transaction Id");
    });
 });
});
