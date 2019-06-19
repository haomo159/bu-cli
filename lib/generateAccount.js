'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')
const repeat = require('repeat-element')

const util = require('../util')

module.exports = async (host, privateKey, accountNumber) => {
  accountNumber = accountNumber || 50
  const sdk = new BumoSDK({
    host: host
  })
  const sourceAddress = util.account.getAddress(privateKey)

  const result = await sdk.account.getNonce(sourceAddress)

  if (result.errorCode !== 0) {
    console.log(result)
    return
  }
  let nonce = result.result.nonce

  nonce = new BigNumber(nonce).plus(1).toString(10)

  let accountList = []

  const tmp = repeat('', accountNumber)
  for (const item of tmp) {
    const account = await sdk.account.create()
    if (account.errorCode === 0) {
      accountList.push(account.result)
    }
  }
  const operations = []
  for (const account of accountList) {
    const sendBuOperation = sdk.operation.buSendOperation({
      sourceAddress: sourceAddress,
      destAddress: account.address,
      buAmount: '100000000'
    })
    if (sendBuOperation.errorCode !== 0) {
      console.log(sendBuOperation)
      return
    }

    const operation = sendBuOperation.result.operation
    operations.push(operation)
  }

  const args = {
    sourceAddress,
    nonce,
    operations: operations,
    signtureNumber: '100'
  }

  let feeData = await sdk.transaction.evaluateFee(args)
  if (feeData.errorCode !== 0) {
    console.log(feeData)
    return
  }

  let feeLimit = feeData.result.feeLimit
  let gasPrice = feeData.result.gasPrice

  // 2. build blob
  let blobInfo = sdk.transaction.buildBlob({
    sourceAddress: sourceAddress,
    gasPrice,
    feeLimit,
    nonce: nonce,
    operations: operations
  })

  if (blobInfo.errorCode !== 0) {
    console.log(blobInfo)
    return
  }

  let blob = blobInfo.result.transactionBlob

  // 3. sign blob
  let signatureInfo = sdk.transaction.sign({
    privateKeys: [ privateKey ],
    blob
  })

  if (signatureInfo.errorCode !== 0) {
    console.log(signatureInfo)
    return
  }

  let signature = signatureInfo.result.signatures
  // 4. submit transaction
  let transactionInfo = await sdk.transaction.submit({
    blob,
    signature: signature
  })

  return {
    accountList,
    transactionInfo
  }
}
