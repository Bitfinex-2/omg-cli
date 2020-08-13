const { transaction } = require("@omisego/omg-js-util/src");
const ChildChain = require("@omisego/omg-js-childchain/src/childchain");
const RootChain = require("@omisego/omg-js-rootchain/src/rootchain");
const txUtils = require("@omisego/omg-js-rootchain/src/txUtils");
const rpcAPI = require("@omisego/omg-js-childchain/src/rpc/rpcApi");

const fs = require("fs");
const BigNumber = require("bn.js");
const Web3 = require("web3");

export class OMGCLI {
  watcherInfo: any;
  rootChain: any;
  options: any;
  txOptions: any;
  web3: any;
  config: any;

  constructor(config: any) {
    this.config = config;

    const web3 = new Web3(config.eth_node);

    this.watcherInfo = new ChildChain({
      watcherUrl: config.watcher_info_url,
      watcherProxyUrl: config.watcher_proxy_url,
      plasmaContractAddress: config.plasmaframework_contract_address
    });
    this.rootChain = new RootChain({
      web3,
      plasmaContractAddress: config.plasmaframework_contract_address,
    });
    this.web3 = web3;

    this.txOptions = {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address,
      gas: 6000000,
      gasPrice: "10000000000",
    };
  }

  decode(encodedTx: String) {
    return transaction.decodeTxBytes(encodedTx);
  }

  encode(pathToJSONFile: String) {
    const txRaw = fs.readFileSync(pathToJSONFile);
    const tx = JSON.parse(txRaw);
    const typedData = transaction.getTypedData(
      tx,
      this.config.plasmaframework_contract_address
    );

    const privateKeys = [this.txOptions.privateKey];
    const signatures = this.watcherInfo.signTransaction(typedData, privateKeys);

    const signedTx = this.watcherInfo.buildSignedTransaction(
      typedData,
      signatures
    );

    return {
      tx: transaction.encode(tx),
      signedTx: signedTx,
    };
  }

  async getUTXOs(address: String, currency?: String) {
    const utxos = await this.watcherInfo.getUtxos(address);
    if (currency) {
      let filteredUTXOS = [];
      for (const utxo of utxos) {
        if (utxo.currency === currency) {
          filteredUTXOS.push(utxo);
        }
      }
      return filteredUTXOS;
    } else {
      return utxos;
    }
  }

  async getUTXO(address: String, utxoPos: Number) {
    const utxos = await this.watcherInfo.getUtxos(address);

    for (const utxo of utxos) {
      if (utxo.utxo_pos == utxoPos) {
        return utxo;
      }
    }
  }

  async getExitableUTXOs(address: String, currency?: String) {
    const utxos = await rpcAPI.post({
      url: `${this.config.watcher_security_url}/account.get_exitable_utxos`,
      body: { address: address },
      proxyUrl: this.config.watcher_proxy_url,
    });
    if (currency) {
      let filteredUTXOS = [];
      for (const utxo of utxos) {
        if (utxo.currency === currency) {
          filteredUTXOS.push(utxo);
        }
      }
      return filteredUTXOS;
    } else {
      return utxos;
    }
  }

  async getExitableUTXO(address: String, utxoPos: Number) {
    const utxos = await this.watcherInfo.getExitableUTXOs(address);

    for (const utxo of utxos) {
      if (utxo.utxo_pos == utxoPos) {
        return utxo;
      }
    }
  }

  async getExitQueue(address: String) {
    return await this.rootChain.getExitQueue(address);
  }

  async getExitPeriod() {
    return await this.rootChain.plasmaContract.methods.minExitPeriod().call();
  }

  async getBalance(address: String) {
    return await this.watcherInfo.getBalance(address);
  }

  async getStatus() {
    return await this.watcherInfo.status();
  }

  async getIFEId(tx: any) {
    return await this.rootChain.getInFlightExitId({
      txBytes: tx,
    });
  }

  async getSEData(utxoPos: Number) {
    const utxo = transaction.decodeUtxoPos(utxoPos);
    const exitData = await this.watcherInfo.getExitData(utxo);
    return exitData;
  }

  async startSE(exitData: any) {
    return await this.rootChain.startStandardExit({
      utxoPos: exitData.utxo_pos,
      outputTx: exitData.txbytes,
      inclusionProof: exitData.proof,
      txOptions: this.txOptions,
    });
  }

  async getSEChallengeData(utxoPos: Number) {
    return await this.watcherInfo.getChallengeData(utxoPos);
  }

  async challengeSE(challengeData: any) {
    return await this.rootChain.challengeStandardExit({
      standardExitId: challengeData.exit_id,
      exitingTx: challengeData.exiting_tx,
      challengeTx: challengeData.txbytes,
      inputIndex: challengeData.input_index,
      challengeTxSig: challengeData.sig,
      txOptions: this.txOptions,
    });
  }

  async startIFE(exitData: any) {
    return await this.rootChain.startInFlightExit({
      inFlightTx: exitData.in_flight_tx,
      inputTxs: exitData.input_txs,
      inputUtxosPos: exitData.input_utxos_pos,
      inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
      inFlightTxSigs: exitData.in_flight_tx_sigs,
      txOptions: this.txOptions,
    });
  }

  async getIFEData(tx: any) {
    /*
    const typedData = transaction.getTypedData(
      tx,
      this.config.plasmaframework_contract_address
    );

    const privateKeys = [this.txOptions.privateKey];

    const signatures = this.watcherInfo.signTransaction(typedData, privateKeys);
    const signedTxn = this.watcherInfo.buildSignedTransaction(
      typedData,
      signatures
    );*/

    const signedTxn = await this.signDecodedTx(tx);
    return await this.watcherInfo.inFlightExitGetData(signedTxn);
  }

  async getTransaction(hash: string) {
    const tx = await this.watcherInfo.getTransaction(hash);
    return {
      inputs: tx.inputs,
      outputs: tx.outputs,
      txType: tx.txType,
      metadata: tx.metadata,
    };
  }

  async getFees() {
    return await this.watcherInfo.getFees();
  }

  async getFee(currency: any) {
    const fees = await this.getFees();
    for (const fee of fees["1"]) {
      if (fee.currency === currency) {
        return fee.amount;
      }
    }
    throw `Error: No fees discovered for ${currency}`;
  }

  async deposit(asset: String, amount?: Number) {
    let approvalReceipt;
    let depositReceipt;

    if (asset) {
      if (fs.existsSync(asset)) {
        const txRaw = fs.readFileSync(asset);
        const tx = JSON.parse(txRaw);
        const encodedTx = transaction.encode(tx);

        const isEth = tx.outputs[0].currency === transaction.ETH_CURRENCY;
        const { address, contract } = isEth
          ? await this.rootChain.getEthVault()
          : await this.rootChain.getErc20Vault();

        if (!isEth) {
          approvalReceipt = await this.rootChain.approveToken({
            erc20Address: this.config.erc20_contract,
            amount: this.config.alice_erc20_deposit_amount,
            txOptions: this.txOptions,
          });
        }

        const txDetails = {
          from: this.txOptions.from,
          to: address,
          ...(isEth ? { value: amount } : {}),
          data: txUtils.getTxData(this.web3, contract, "deposit", encodedTx),
          gas: this.txOptions.gas,
        };
        depositReceipt = await txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: this.txOptions.privateKey,
        });
      } else if (asset == transaction.ETH_CURRENCY) {
        if (!amount) {
          amount = new BigNumber(
            this.web3.utils.toWei(this.config.alice_eth_deposit_amount, "ether")
          );
        }
        depositReceipt = await this.rootChain.deposit({
          amount: amount,
          currency: asset,
          txOptions: this.txOptions,
        });
      } else {
        if (!amount) {
          amount = this.config.alice_erc20_deposit_amount;
        }

        approvalReceipt = await this.rootChain.approveToken({
          erc20Address: asset,
          amount: new BigNumber(amount),
          txOptions: this.txOptions,
        });

        depositReceipt = await this.rootChain.deposit({
          amount: new BigNumber(amount),
          currency: asset,
          txOptions: this.txOptions,
        });
      }
    }
    return {
      approvalReceipt: approvalReceipt,
      depositReceipt: depositReceipt,
    };
  }

  async piggybackIFEOnInput(tx: String, inputIndex: Number) {
    return await this.rootChain.piggybackInFlightExitOnInput({
      inFlightTx: tx,
      inputIndex: inputIndex,
      txOptions: this.txOptions,
    });
  }

  async piggybackIFEOnOutput(tx: String, outputIndex: Number) {
    return await this.rootChain.piggybackInFlightExitOnOutput({
      inFlightTx: tx,
      outputIndex: outputIndex,
      txOptions: this.txOptions,
    });
  }

  async getChallengeIFEOutputSpentData(tx: any, outputIndex: Number) {
    return await this.watcherInfo.inFlightExitGetOutputChallengeData(
      tx,
      outputIndex
    );
  }

  async challengeIFEOutputSpent(challengeData: any) {
    return await this.rootChain.challengeInFlightExitOutputSpent({
      inFlightTx: challengeData.in_flight_txbytes,
      inFlightTxInclusionProof: challengeData.in_flight_proof,
      inFlightTxOutputPos: challengeData.in_flight_output_pos,
      challengingTx: challengeData.spending_txbytes,
      challengingTxInputIndex: challengeData.spending_input_index,
      challengingTxWitness: challengeData.spending_sig,
      txOptions: this.txOptions,
    });
  }

  async getChallengeIFEInputSpentData(tx: any, inputIndex: Number) {
    return await this.watcherInfo.inFlightExitGetInputChallengeData(
      tx,
      inputIndex
    );
  }

  async challengeIFEInputSpent(challengeData: any) {
    return await this.rootChain.challengeInFlightExitInputSpent({
      inFlightTx: challengeData.in_flight_txbytes,
      inFlightTxInputIndex: challengeData.in_flight_input_index,
      challengingTx: challengeData.spending_txbytes,
      challengingTxInputIndex: challengeData.spending_input_index,
      challengingTxWitness: challengeData.spending_sig,
      inputTx: challengeData.input_tx,
      inputUtxoPos: challengeData.input_utxo_pos,
      txOptions: this.txOptions,
    });
  }

  async challengeIFENotCanonical(competitor: any) {
    return await this.rootChain.challengeInFlightExitNotCanonical({
      inputTx: competitor.input_tx,
      inputUtxoPos: competitor.input_utxo_pos,
      inFlightTx: competitor.in_flight_txbytes,
      inFlightTxInputIndex: competitor.in_flight_input_index,
      competingTx: competitor.competing_txbytes,
      competingTxInputIndex: competitor.competing_input_index,
      competingTxPos: competitor.competing_tx_pos,
      competingTxInclusionProof: competitor.competing_proof,
      competingTxWitness: competitor.competing_sig,
      txOptions: this.txOptions,
    });
  }

  async getChallengeDataIFENotCanonical(tx: any) {
    return await this.watcherInfo.inFlightExitGetCompetitor(tx);
  }

  async deleteNonPiggybackedIFE(exitId: String) {
    return await this.rootChain.deleteNonPiggybackedInFlightExit({
      exitId,
      txOptions: this.txOptions,
    });
  }

  async addFeesToTx(tx: any) {
    const fees = await this.getFees();
    for (const fee of fees["1"]) {
      for (let i = 0; i < tx.outputs.length; i++) {
        const feeAmount = new BigNumber(fee.amount);
        const outputAmount = new BigNumber(tx.outputs[i].amount);

        if (
          fee.currency === tx.outputs[i].currency &&
          feeAmount.lt(outputAmount)
        ) {
          const newOutputAmount = outputAmount.sub(feeAmount);
          tx.outputs[i].amount = newOutputAmount;
          return tx;
        }
      }
    }
  }

  async sendDecodedTx(decodedTx: any) {
    const signedTxn = await this.signDecodedTx(decodedTx);
    return await this.watcherInfo.submitTransaction(signedTxn);
  }

  async sendEncodedTx(encodedTx: string) {
    return await this.watcherInfo.submitTransaction(encodedTx);
  }

  async signDecodedTx(decodedTx: any) {
    const typedData = transaction.getTypedData(
      decodedTx,
      this.config.plasmaframework_contract_address
    );

    let privateKeys: string[] = [];

    for (let i = 0; i < decodedTx.inputs.length; i++) {
      privateKeys.push(this.txOptions.privateKey);
    }

    return await this.signTypedData(typedData, privateKeys);
  }

  async signTypedData(typedData: any, privateKeys: string[]) {
    const signatures = this.watcherInfo.signTransaction(typedData, privateKeys);
    return this.watcherInfo.buildSignedTransaction(typedData, signatures);
  }

  async sendTypedTx(owner: String, currency: String, amount: number) {
    const payments = [
      {
        owner: owner,
        currency: currency,
        amount: amount,
      },
    ];

    const fee = {
      currency: transaction.ETH_CURRENCY,
    };

    const createdTx = await this.watcherInfo.createTransaction({
      owner: owner,
      payments,
      fee,
    });

    const txTypedData = this.watcherInfo.signTypedData(
      createdTx.transactions[0],
      [this.txOptions.privateKey]
    );
    return await this.watcherInfo.submitTyped(txTypedData);
  }

  /*
   * utxo_pos needs to be fee enabled and have enough balance to pay the fees
   */
  async generateTx(from: String, utxoPositions: number[]) {
    let utxos: any[] = [];
    for (const utxoPosition of utxoPositions) {
      const utxo = await this.getUTXO(from, utxoPosition);
      utxos.push(utxo);
    }

    if (utxos.length) {
      let inputs: any = [];
      let outputs: any = [];
      for (let x = 0; x < utxos.length; x++) {
        let input: any = {};
        input.blknum = utxos[x].blknum;
        input.txindex = utxos[x].txindex;
        input.oindex = utxos[x].oindex;
        inputs.push(input);

        let output: any = {};
        output.outputGuard = utxos[x].owner;
        output.currency = utxos[x].currency;
        output.amount = utxos[x].amount;
        output.outputType = 1;
        outputs.push(output);
      }
      let tx: any = {
        transactionType: 1,
        inputs,
        outputs,
        metadata:
          "0x0000000000000000000000000000000000000000000000000000000000001337",
      };
      const newTx = await this.addFeesToTx(tx);
      if (newTx) {
        return newTx;
      } else {
        throw `Error: Could not add fees to the tx
        `;
      }
    } else {
      throw `Error: No utxos found `;
    }
  }

  async getTxDetails(hash: string) {
    return await this.watcherInfo.getTransaction(hash);
  }

  async processExits(asset: String) {
    return await this.rootChain.processExits({
      token: asset,
      exitId: 0,
      maxExitsToProcess: 5,
      txOptions: this.txOptions,
    });
  }

  async addToken(asset: String) {
    return await this.rootChain.addToken({
      token: asset,
      txOptions: this.txOptions,
    });
  }

  async respondToNonCanonicalIFEChallenge(proof: any) {
    return await this.rootChain.respondToNonCanonicalChallenge({
      inFlightTx: proof.in_flight_txbytes,
      inFlightTxPos: proof.in_flight_tx_pos,
      inFlightTxInclusionProof: proof.in_flight_proof,
      txOptions: this.txOptions,
    });
  }

  async getProveIFECanonical(tx: String) {
    return await this.watcherInfo.inFlightExitProveCanonical(tx);
  }

  async getIFECompetitor(tx: string) {
    return await this.watcherInfo.inFlightExitGetCompetitor(tx);
  }
}
