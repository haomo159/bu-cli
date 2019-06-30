'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')
const uuidv4 = require('uuid/v4')

const util = require('../util')

module.exports = async (opts = {}) => {
  try {
    // console.log('create sku ... ...')
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
          attributes: {
            'id': ['parentid', 'name', 'type', 'value', 'decimals', 'uint'],
            '2': ['0', '尺码', 'text', item['size'], '-', '-'],
            '3': ['0', '零售价', 'text', item['retailPrice'], '-', '-'],
            '4': ['0', '货号', 'text', item['productCode'], '-', '-'],
            '5': ['0', '上市日期', 'text', item['listingDate'], '-', '-']
          }
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
    let feeLimit = '99000000'
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
    // console.log('get result is :')
    // console.log(transactionInfo)
    return transactionInfo
  } catch (err) {
    // console.log('$$$$$ i fond some error $$$$$$$')
    // console.log(err)
    throw err
  }
}
