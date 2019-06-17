'use strict'

const encryption = require('bumo-encryption')
const KeyPair = encryption.keypair

exports.getAddress = function getAddress (privateKey) {
  // Get encPublicKey
  let encPublicKey = KeyPair.getEncPublicKey(privateKey)
  // Get address
  const address = KeyPair.getAddress(encPublicKey)
  return address
}
