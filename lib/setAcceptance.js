'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')

const util = require('../util')

module.exports = async (host, privateKey, contractAddress) => {
  const sdk = new BumoSDK({
    host: host
  })
  const publicKey = util.account.getPublicKey(privateKey)
  const sourceAddress = util.account.getAddress(privateKey)

  const nonceInfo = await sdk.account.getNonce(sourceAddress)

  if (nonceInfo.errorCode !== 0) {
    console.log('get nonce error')
    console.log(nonceInfo)
    return
  }

  let nonce = nonceInfo.result.nonce
  nonce = new BigNumber(nonce).plus(1).toString(10)

  const inputObj = {
    method: 'setAcceptance',
    params: {
      id: '1223455',
      publicKey: publicKey,
      fullName: '承兑方全名',
      shortName: 'MYDEMO',
      logo: 'mylogo',
      contact: 'my@bubi.cn',
      period: '7',
      addition: {
        'id': [ 'parentid', 'name', 'type', 'value', 'decimals', 'uint' ],
        '1': ['0', '承兑方地址', 'text', '[承兑方地址]', '-', '-'],
        '3': ['0', '承兑方邮编', 'text', '[承兑方邮编]', '-', '-']
      }
    }
  }

  let opt = {
    contractAddress,
    sourceAddress,
    buAmount: '0',
    input: JSON.stringify(inputObj)
  }

  let contractInvokeByBUOperation = await sdk.operation.contractInvokeByBUOperation(opt)

  if (contractInvokeByBUOperation.errorCode !== 0) {
    console.log(contractInvokeByBUOperation)
    return
  }

  const operationItem = contractInvokeByBUOperation.result.operation

  const args = {
    sourceAddress,
    nonce,
    operations: [ operationItem ],
    signtureNumber: '100'
  }

  let feeData = await sdk.transaction.evaluateFee(args)
  if (feeData.errorCode !== 0) {
    console.log('get feeData error')
    console.log(feeData)
    return
  }

  let feeLimit = feeData.result.feeLimit
  let gasPrice = feeData.result.gasPrice

  console.log('feeLimit : %s', feeLimit)
  console.log('gasPrice : %s', gasPrice)
  // 2. build blob
  let blobInfo = sdk.transaction.buildBlob({
    sourceAddress: sourceAddress,
    gasPrice,
    feeLimit,
    nonce: nonce,
    operations: [ operationItem ]
  })

  if (blobInfo.errorCode !== 0) {
    console.log('build blob error')
    return blobInfo
  }

  const blob = blobInfo.result.transactionBlob

  // 3. sign blob
  const signatureInfo = sdk.transaction.sign({
    privateKeys: [ privateKey ],
    blob
  })

  if (signatureInfo.errorCode !== 0) {
    console.log('signature error')
    return signatureInfo
  }

  const signature = signatureInfo.result.signatures
  // 4. submit transaction
  let transactionInfo = await sdk.transaction.submit({
    blob,
    signature
  })

  return transactionInfo
}
