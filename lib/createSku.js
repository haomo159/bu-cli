'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')
const uuidv4 = require('uuid/v4')

const util = require('../util')

module.exports = async (opts = {}) => {
  const { host, privateKey, contractAddress, data, submitPrivateKey, submitAddress } = opts
  const sdk = new BumoSDK({
    host: host
  })
  const sourceAddress = util.account.getAddress(privateKey)
  const result = await sdk.account.getNonce(submitAddress)

  if (result.errorCode !== 0) {
    console.log(result)
    return
  }
  let nonce = result.result.nonce

  nonce = new BigNumber(nonce).plus(1).toString(10)

  const operations = []
  const tokenList = []
  for (let item of data) {
    tokenList.push(item.tokenId)
    const inputObj = {
      method: 'issue',
      params: {
        skuId: uuidv4().split('-').join(''),
        trancheId: undefined,
        isDefaultTranche: undefined,
        spuId: undefined,
        name: `${item.brand}-${item.productCode}-${item.size}`,
        symbol: uuidv4().split('-').join('').substr(0, 15),
        // tokenId: item.tokenId,
        tokenId: uuidv4().split('-').join(''),
        tokenInfo: `${item.brand}-${item.productCode}-${item.size}`,
        mainIcon: 'aaaaaa',
        viceIcons: [],
        labels: [item.brand, item.category],
        description: `${item.brand}-${item.productCode}-${item.size}`,
        redemptionAddress: 'buQtgmwvgG9CDUbJNRZhsYjLV1xD4wWamcmH',
        acceptanceId: '1223455',
        abstracts: undefined,
        attributes: undefined
      }
    }
    let contractInvokeByBUOperation = await sdk.operation.contractInvokeByBUOperation({
      contractAddress,
      sourceAddress: sourceAddress,
      buAmount: '0',
      input: JSON.stringify(inputObj)
    })

    if (contractInvokeByBUOperation.errorCode !== 0) {
      console.log(contractInvokeByBUOperation)
      return
    }

    const operationItem = contractInvokeByBUOperation.result.operation
    operations.push(operationItem)
  }

  const args = {
    sourceAddress: submitAddress,
    nonce,
    operations: operations,
    signtureNumber: '100'
  }

  let feeData = await sdk.transaction.evaluateFee(args)
  if (feeData.errorCode !== 0) {
    feeData.tokenList = tokenList
    return feeData
  }

  // let feeLimit = feeData.result.feeLimit
  // let gasPrice = feeData.result.gasPrice
  // console.log('====================')
  // console.log(feeLimit)
  // console.log(gasPrice)
  // console.log('====================')
  // feeLimit = '10000000'
  // let feeLimit = '10000000'
  let feeLimit = '50000000'
  let gasPrice = '1000'
  // 2. build blob
  let blobInfo = sdk.transaction.buildBlob({
    sourceAddress: submitAddress,
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
    privateKeys: [ submitPrivateKey, privateKey ],
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

  transactionInfo.tokenList = tokenList
  return transactionInfo
}
