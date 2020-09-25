require("source-map-support").install();
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const JSONbig = require("json-bigint");
const optionDefs = require("./options");
const config = require("../config.js");

import { OMGCLI } from "./omgcli";
import { Util } from "./util";
import { Bot } from "./bot";
import { utils } from "mocha";

let optionsLists: object[] = [];

const omgcli = new OMGCLI(config);

async function run() {
  for (const section of optionDefs["optionDefinitions"].slice(
    1,
    optionDefs["optionDefinitions"].length
  )) {
    optionsLists = optionsLists.concat(section["optionList"]);
  }
  const options = commandLineArgs(optionsLists);

  if (options["setTxOptions"]) {
    const txOptionsRaw = fs.readFileSync(options["setTxOptions"]);
    const txOptions = JSON.parse(txOptionsRaw);
    omgcli.txOptions["privateKey"] = txOptions["privateKey"];
    omgcli.txOptions["from"] = txOptions["from"];
  }

  if (options["decode"]) {
    const decodedTx = omgcli.decode(options["decode"]);
    Util.printObject(decodedTx, "");
  } else if (options["getUTXOs"]) {
    const utxos = await omgcli.getUTXOs(options["getUTXOs"]);
    Util.printObject(utxos);
  } else if (options["getExitPeriod"]) {
    const exitPeriod = await omgcli.getExitPeriod();
    console.log(`Exit period in seconds: ${exitPeriod}`);
  } else if (options["getBalance"]) {
    const balance = await omgcli.getBalance(options["getBalance"]);
    Util.printObject(balance);
  } else if (options["getFees"]) {
    Util.printObject(await omgcli.getFees());
  } else if (options["encode"]) {
    const result = omgcli.encode(options["encode"]);
    Util.printObject(result);
  } else if (options["getByzantineEvents"]) {
    const response = await omgcli.getStatus();

    if (response["byzantine_events"].length) {
      Util.printObject(response["byzantine_events"], "Byzantine events");
    } else {
      console.log("No Byzantine events");
    }
  } else if (options["getIFEId"]) {
    const exitId = await omgcli.getIFEId(options["getIFEId"]);
    console.log("Exit id: ", exitId);
  } else if (options["getIFEs"]) {
    const response = await omgcli.getStatus();

    if (response["in_flight_exits"].length) {
      Util.printObject(response["in_flight_exits"]);
    } else {
      console.log("No IFEs");
    }
  } else if (options["deposit"]) {
    let result;
    if (options["amount"]) {
      result = await omgcli.deposit(options["deposit"], options["amount"]);
    } else {
      result = await omgcli.deposit(options["deposit"]);
    }

    if (result.approvalReceipt) {
      console.log(`Asset ${options["deposit"]} approval successful`);
      Util.printEtherscanLink(result.approvalReceipt.transactionHash, config);
    }

    console.log(`Deposit ${options["deposit"]} successful`);
    Util.printExplorerLinks(result.depositReceipt, config);
  } else if (options["addExitQueue"]) {
    const txReceipt = await omgcli.addToken(options["addExitQueue"]);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getExitQueue"]) {
    let results = await omgcli.getExitQueue(options["getExitQueue"]);

    for (let x = 0; x < results.length; x++) {
      results[x].exitableAtDate = new Date(
        results[x].exitableAt * 1000
      ).toString();
    }

    Util.printObject(results);
  } else if (options["processExits"]) {
    const txReceipt = await omgcli.processExits(options["processExits"]);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["addFees"]) {
    const txRaw = fs.readFileSync(options["addFees"]);
    const tx = JSONbig.parse(txRaw);

    const newTx = await omgcli.addFeesToTx(tx);

    if (newTx) {
      Util.printObject(newTx);
    } else {
      console.log(`Error: Could not add fees to the tx`);
    }
  } else if (options["getExitLogs"]) {
    // PaymentExitGame creation block 
    const startBlock = Number(9687476);
    const endBlock = Number(await omgcli.web3.eth.getBlockNumber());
    const events: string[] = ["ExitStarted", "InFlightExitStarted"];
    const paymentExitGame: any = await omgcli.rootChain.getPaymentExitGame();
    const logs = await Util.getLogs(paymentExitGame.contract, startBlock, endBlock, events)

    console.log(paymentExitGame.address)
    for (const log of logs) {
      console.log(`Checking tx hash: ${log.transactionHash}`)

      const txDetails = await omgcli.web3.eth.getTransactionReceipt(log.transactionHash);

      if (txDetails.contractAddress != null) {
        console.log(`Found a contract creation tx: ${txDetails.contractAddress}`)
      } else if (omgcli.web3.utils.toChecksumAddress(txDetails.to) != omgcli.web3.utils.toChecksumAddress(paymentExitGame.address)) {
        console.log(`The target contract from the EOA is not the PaymentExitGame: ${txDetails.to}`)
      }
    }

  } else if (options["generateTx"]) {
    const utxos: number[] = options["generateTx"].split(",");
    const newTx = await omgcli.generateTx(omgcli.txOptions["from"], utxos);

    Util.printObject(newTx);
  } else if (options["getTxDetails"]) {
    const response = await omgcli.getTxDetails(options["getTxDetails"]);
    Util.printObject(response);
  } else if (options["generateTxHash"]) {
    console.log(omgcli.web3.utils.keccak256(options["generateTxHash"]));
  } else if (options["sendTx"]) {
    const txRaw = fs.readFileSync(options["sendTx"]);
    const tx = JSONbig.parse(txRaw);

    const txReceipt = await omgcli.sendDecodedTx(tx);
    Util.printOMGBlockExplorerLink(txReceipt.txhash, config);
  } else if (options["sendTypedTx"]) {
    let amount = 1;
    if (options["amount"]) {
      amount = options["amount"];
    }
    const txReceipt = await omgcli.sendTypedTx(
      omgcli.txOptions.from,
      options["sendTypedTx"],
      amount
    );

    Util.printOMGBlockExplorerLink(txReceipt.txhash, config);
  } else if (options["getSEData"]) {
    Util.printObject(await omgcli.getSEData(parseInt(options["getSEData"])));
  } else if (options["startSE"]) {
    const exitDataRaw = fs.readFileSync(options["startSE"]);
    const exitData = JSONbig.parse(exitDataRaw);

    const txReceipt = await omgcli.startSE(exitData);

    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getSEChallengeData"]) {
    Util.printObject(
      await omgcli.getSEChallengeData(parseInt(options["getSEChallengeData"]))
    );
  } else if (options["challengeSE"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeSE"]);
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeSE(challengeData);

    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getIFEData"]) {
    const txRaw = fs.readFileSync(options["getIFEData"]);
    const tx = JSONbig.parse(txRaw);

    const ifeData = await omgcli.getIFEData(tx);
    Util.printObject(ifeData);
  } else if (options["startIFE"]) {
    const txRaw = fs.readFileSync(options["startIFE"]);
    const exitData = JSONbig.parse(txRaw);

    const receipt = await omgcli.startIFE(exitData);
    Util.printExplorerLinks(receipt, config);
  } else if (options["piggybackIFEOnInput"]) {
    const txReceipt = await omgcli.piggybackIFEOnInput(
      options["piggybackIFEOnInput"],
      options["inputIndex"]
    );
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["piggybackIFEOnOutput"]) {
    const txReceipt = await omgcli.piggybackIFEOnOutput(
      options["piggybackIFEOnOutput"],
      options["outputIndex"]
    );
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getChallengeIFEInputSpentData"]) {
    const challengeData = await omgcli.getChallengeIFEInputSpentData(
      options["challengeIFEInputSpentData"],
      Number(options["inputIndex"])
    );
    Util.printObject(challengeData);
  } else if (options["challengeIFEInputSpent"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeIFEInputSpent"]);
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeIFEInputSpent(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getChallengeIFEOutputSpentData"]) {
    const challengeData = await omgcli.getChallengeIFEOutputSpentData(
      options["getChallengeIFEOutputSpentData"],
      Number(options["outputIndex"])
    );
    Util.printObject(challengeData);
  } else if (options["challengeIFEOutputSpent"]) {
    const challengeDataRaw = fs.readFileSync(
      options["challengeIFEOutputSpent"]
    );
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeIFEOutputSpent(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getIFECompetitor"]) {
    const competitor = await omgcli.getIFECompetitor(
      options["getIFECompetitor"]
    );
    Util.printObject(competitor);
  } else if (options["getProveIFECanonical"]) {
    const prove = await omgcli.getProveIFECanonical(
      options["getProveIFECanonical"]
    );
    Util.printObject(prove);
  } else if (options["challengeIFENotCanonical"]) {
    const challengeDataRaw = fs.readFileSync(
      options["challengeIFENotCanonical"]
    );
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeIFENotCanonical(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["deleteNonPiggybackedIFE"]) {
    const exitId = await omgcli.getIFEId(options["deleteNonPiggybackedIFE"]);

    const txReceipt = await omgcli.deleteNonPiggybackedIFE(exitId);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["autoChallenge"]) {
    console.log("---> Watching for Byzantine events <---");
    const bot = new Bot(omgcli);
    await bot.run();
    // eslint-disable-next-line no-constant-condition
  } else {
    const usage = commandLineUsage(optionDefs["optionDefinitions"]);
    console.log(usage);
  }
}
run();
