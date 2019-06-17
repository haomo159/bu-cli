'use strict'

const BumoSDK = require('bumo-sdk')
const BigNumber = require('bignumber.js')
const fs = require('fs')
const path = require('path')

const account = require('./account')

module.exports = async (host, privateKey) => {
  const sdk = new BumoSDK({
    host: host
  })
  const sourceAddress = account.getAddress(privateKey)

  const result = await sdk.account.getNonce(sourceAddress)

  if (result.errorCode !== 0) {
    console.log(result)
    return
  }
  let nonce = result.result.nonce

  nonce = new BigNumber(nonce).plus(1).toString(10)

  const contractCode = fs.readFileSync(path.resolve(path.join('../lib/contract')))
  const initInput = {
    companyFullName: 'BUMO社区',
    companyCertification: {
      '1': [ '0', '企业组织机构代码', 'text', '99999999', '-', '-' ],
      '2': [ '0', '法人名称', 'text', '里斯', '-', '-' ],
      '3': [ '0', '法人身份证号', 'text', '123', '-', '-' ],
      '4': [
        '0',
        '营业执照照片',
        'image',
        'jpeg|https://www.bumo.io/img_dpos/ab/8f/ce/acf0c8ba504b4639a916c142c02028e4.jpg|sha256|a9cd4908ad7ec1fc1cc8ec84641fa55b3abb93a731625e7eb17d2c41babe9f25',
        '-',
        '-'
      ],
      '5': [
        '0',
        '法人身份证正面照片',
        'image',
        'jpeg|https://www.bumo.io/img_dpos/ab/8f/ce/acf0c8ba504b4639a916c142c02028e4.jpg|sha256|a9cd4908ad7ec1fc1cc8ec84641fa55b3abb93a731625e7eb17d2c41babe9f25',
        '-',
        '-'
      ],
      '6':
        [ '0',
          '法人身份证反面照片',
          'image',
          'jpeg|https://www.bumo.io/img_dpos/ab/8f/ce/acf0c8ba504b4639a916c142c02028e4.jpg|sha256|a9cd4908ad7ec1fc1cc8ec84641fa55b3abb93a731625e7eb17d2c41babe9f25',
          '-',
          '-'
        ],
      id: [ 'parentId', 'name', 'type', 'value', 'decimals', 'uint' ]
    },
    companyShortName: 'BUMO',
    companyContact: '4bvm820bveyt1xmxokijsgx4vxv5ypxntr98npfcrxklfimlqg9d5to0tw9e5usb'
  }
  let contractCreateOperation = sdk.operation.contractCreateOperation({
    sourceAddress,
    initBalance: '100000000',
    type: 0,
    payload: contractCode.toString('utf8'),
    initInput: JSON.stringify(initInput)
  })

  if (contractCreateOperation.errorCode !== 0) {
    console.log(contractCreateOperation)
    return
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
    operations: [ operationItem ]
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

  return transactionInfo
}
