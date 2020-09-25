const chalk = require("chalk");
const fs2 = require("fs");

const banner = fs2.readFileSync("./static/header.txt").toString();

const optionDefinitions = [
  {
    content: chalk.green(banner),
    raw: true,
  },
  {
    header: "General",
    optionList: [
      {
        name: "decode",
        alias: "d",
        type: String,
        typeLabel: "{underline tx}",
        description: "Decode an RLP encoded tx",
      },
      {
        name: "encode",
        alias: "e",
        type: String,
        typeLabel: "{underline file}",
        description: "Encode a tx from a json file",
      },
      {
        name: "getExitPeriod",
        type: Boolean,
        description: "Get the minimum exit period in seconds",
      },
      {
        name: "getFees",
        type: Boolean,
        description: "Get fee information ",
      },
      {
        name: "getByzantineEvents",
        type: Boolean,
        description: "Get a list of Byzantine events",
      },
      {
        name: "processExits",
        type: String,
        typeLabel: "{underline address}",
        description: "Process exits for ETH/token",
      },
      {
        name: "addExitQueue",
        type: String,
        typeLabel: "{underline address}",
        description: "Add a queue for ETH or a token",
      },
      {
        name: "getExitQueue",
        type: String,
        typeLabel: "{underline address}",
        description: "Get the queue for ETH or a token",
      },
      {
        name: "setTxOptions",
        type: String,
        typeLabel: "{underline file}",
        description: "Set tx options",
      },
      {
        name: "autoChallenge",
        type: Boolean,
        description: "Auto challenge byzantine events",
      },
      {
        name: "getExitLogs",
        type: Boolean,
        description: "Get all exit related events",
      },
      {
        name: "help",
        description: "Print this usage guide.",
        alias: "h",
        defaultOption: true,
      },
    ],
  },
  {
    header: "Deposit",
    optionList: [
      {
        name: "deposit",
        type: String,
        typeLabel: "{underline address}",
        description: "Deposit ETH/Tokens from Alice's account",
      },
      {
        name: "amount",
        type: String,
        typeLabel: "{underline number}",
        description:
          "Specify the amount of ETH/Tokens that should be deposited",
      },
    ],
  },
  {
    header: "Plasma",
    optionList: [
      {
        name: "addFees",
        alias: "f",
        type: String,
        typeLabel: "{underline file}",
        description: "Attempt to add fees to a tx",
      },
      {
        name: "generateTx",
        alias: "g",
        type: String,
        typeLabel: "{underline number}",
        description: "Generate a tx including fees from UTXO",
      },
      {
        name: "generateTxHash",
        type: String,
        typeLabel: "{underline string}",
        description: "Generate the tx hash from an RLP encoded tx",
      },
      {
        name: "getTxDetails",
        type: String,
        typeLabel: "{underline string}",
        description: "Get the tx details from the tx hash",
      },
      {
        name: "sendTx",
        alias: "s",
        type: String,
        typeLabel: "{underline file}",
        description: "Send a transaction on the plasma chain",
      },
      {
        name: "sendTypedTx",
        type: String,
        typeLabel: "{underline file}",
        description: "Send a transaction on the plasma chain sending typed tx",
      },
      {
        name: "getUTXOs",
        alias: "u",
        type: String,
        typeLabel: "{underline address}",
        description: "Get all UTXOs for an owner address",
      },
      {
        name: "getBalance",
        alias: "b",
        type: String,
        typeLabel: "{underline address}",
        description: "Get ETH/token balances for an address",
      },
    ],
  },
  {
    header: "Standard Exit",
    optionList: [
      {
        name: "getSEData",
        type: String,
        typeLabel: "{underline number}",
        description: "Get standard exit data for a UTXO",
      },
      {
        name: "startSE",
        type: String,
        typeLabel: "{underline file}",
        description: "Start a standard exit",
      },
      {
        name: "getSEChallengeData",
        type: String,
        typeLabel: "{underline number}",
        description: "Get standard exit challenge data for a UTXO",
      },
      {
        name: "challengeSE",
        type: String,
        typeLabel: "{underline file}",
        description: "Challenge a standard exit",
      },
    ],
  },
  {
    header: "In-Flight Exit",
    optionList: [
      {
        name: "getIFEs",
        type: Boolean,
        description: "Get ongoing IN-Flight exits",
      },
      {
        name: "getIFEData",
        type: String,
        typeLabel: "{underline file}",
        description: "Get IN-Flight exit data from a decoded tx",
      },
      {
        name: "startIFE",
        type: String,
        typeLabel: "{underline file}",
        description: "Start an IN-Flight exit",
      },
      {
        name: "getIFEId",
        type: String,
        typeLabel: "{underline tx}",
        description: "Get the IN-Flight exit id for an ongoing IN-Flight tx",
      },
      {
        name: "piggybackIFEOnOutput",
        type: String,
        typeLabel: "{underline string}",
        description:
          "Piggy back an IN-Flight tx. Additionally specify the outputIndex",
      },
      {
        name: "outputIndex",
        type: String,
        typeLabel: "{underline string}",
        description: "Output index of a tx",
      },
      {
        name: "piggybackIFEOnInput",
        type: String,
        typeLabel: "{underline string}",
        description:
          "Piggy back an IN-Flight tx. Additionally specify the inputIndex",
      },
      {
        name: "inputIndex",
        type: String,
        typeLabel: "{underline string}",
        description: "Input index of a tx",
      },
      {
        name: "challengeIFEInputSpent",
        type: String,
        typeLabel: "{underline string}",
        description:
          "Challenge an input from an IN-Flight tx. Additionally specify the inputIndex.",
      },
      {
        name: "getChallengeIFEOutputSpentData",
        type: String,
        typeLabel: "{underline string}",
        description:
          "Get IFEOutputSpent challenge data. Additionally specify the outputIndex.",
      },
      {
        name: "challengeIFEOutputSpent",
        type: String,
        typeLabel: "{underline string}",
        description:
          "Challenge an output from an IN-Flight tx. Additionally specify the outputIndex.",
      },
      {
        name: "getIFECompetitor",
        type: String,
        typeLabel: "{underline string}",
        description: "",
      },
      {
        name: "getProveIFECanonical",
        type: String,
        typeLabel: "{underline string}",
        description: "",
      },
      {
        name: "challengeIFENotCanonical",
        type: String,
        typeLabel: "{underline string}",
        description: "Challenge an IN-Flight tx as non-canonical.",
      },
      {
        name: "respondToNonCanonicalChallenge",
        type: String,
        typeLabel: "{underline string}",
        description: "Respond to a non-canonical challenge with a tx.",
      },
      {
        name: "deleteNonPiggybackedIFE",
        type: String,
        typeLabel: "{underline string}",
        description: "Delete a non piggy backed IFE",
      },
    ],
  },
];

module.exports = {
  optionDefinitions,
};
