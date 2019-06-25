'use strict'

const createContract = require('./createContract')
const createSku = require('./createSku')
const generateAccount = require('./generateAccount')
const setAcceptance = require('./setAcceptance')

module.exports = {
  createContract: createContract,
  createSku: createSku,
  generateAccount: generateAccount,
  setAcceptance: setAcceptance
}
