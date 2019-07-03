'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')
const fs = require('fs')
const path = require('path')
const sleepSeconds = require('sleepjs').sleepSeconds

const util = require('../util')

module.exports = async (host, privateKey, initInput) => {
  initInput = initInput || ''
  const sdk = new BumoSDK({
    host: host
  })
  const sourceAddress = util.account.getAddress(privateKey)

  const result = await sdk.account.getNonce(sourceAddress)

  if (result.errorCode !== 0) {
    return result
  }
  let nonce = result.result.nonce

  nonce = new BigNumber(nonce).plus(1).toString(10)
  // get contract code
  const contractCode = fs.readFileSync(path.join(__dirname, '../config/atp61'))

  let contractCreateOperation = sdk.operation.contractCreateOperation({
    sourceAddress,
    initBalance: '100000000',
    type: 0,
    payload: contractCode.toString('utf8'),
    initInput: JSON.stringify(initInput)
  })

  if (contractCreateOperation.errorCode !== 0) {
    return contractCreateOperation
  }

  const operationItem = contractCreateOperation.result.operation

  const args = {
    sourceAddress,
    nonce,
    operations: [operationItem],
    signtureNumber: '100'
    // metadata: 'Test evaluation fee',
  }

  let feeData = await sdk.transaction.evaluateFee(args)
  if (feeData.errorCode !== 0) {
    return feeData
  }

  let feeLimit = feeData.result.feeLimit
  let gasPrice = feeData.result.gasPrice

  // 2. build blob
  let blobInfo = sdk.transaction.buildBlob({
    sourceAddress: sourceAddress,
    gasPrice,
    feeLimit,
    nonce: nonce,
    operations: [ operationItem ]
  })

  if (blobInfo.errorCode !== 0) {
    return blobInfo
  }

  let blob = blobInfo.result.transactionBlob

  // 3. sign blob
  let signatureInfo = sdk.transaction.sign({
    privateKeys: [ privateKey ],
    blob
  })

  if (signatureInfo.errorCode !== 0) {
    return signatureInfo
  }

  let signature = signatureInfo.result.signatures
  // 4. submit transaction
  let transactionInfo = await sdk.transaction.submit({
    blob,
    signature: signature
  })

  if (transactionInfo.errorCode === 0) {
    const hash = transactionInfo.result.hash
    let info = {}
    let retryCount = 20
    while (retryCount > 0) {
      await sleepSeconds(3)
      const addressInfo = await sdk.contract.getAddress(hash)
      if (addressInfo.result.contractAddressList.length === 0) {
        retryCount = retryCount - 1
      } else {
        retryCount = 0
        info = addressInfo
      }
    }
    return info
  }
  return transactionInfo
}
