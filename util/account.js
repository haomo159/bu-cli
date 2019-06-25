'use strict'

const encryption = require('bumo-encryption')
const KeyPair = encryption.keypair

const getAddress = function getAddress (privateKey) {
  // Get encPublicKey
  const encPublicKey = KeyPair.getEncPublicKey(privateKey)
  // Get address
  const address = KeyPair.getAddress(encPublicKey)
  return address
}
const getPublicKey = function getAddress (privateKey) {
  // Get encPublicKey
  const encPublicKey = KeyPair.getEncPublicKey(privateKey)
  return encPublicKey
}

module.exports = {
  getAddress: getAddress,
  getPublicKey: getPublicKey
}
