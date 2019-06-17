#!/usr/bin/env node

'use strict'

const commander = require('commander')
const program = new commander.Command()

const pkg = require('../package')
const createcontract = require('../lib/createContract')

const VERSION = pkg.version
const DESCRIPTION = pkg.description

program
  .name('bu-atp60')
  .version(VERSION)
  .description(DESCRIPTION)
  .usage('[command] [options]')
  .option('-p, --publish', 'publish atp60')
  .option('-k, --key <key>', 'private key')
  .option('-H, --host <host>', 'contract address')
  .parse(process.argv)

// 发布合约
if (program.publish) {
  if (!program.key) {
    console.log(`option '-k, --key <key>' argument missing`)
  }
  if (!program.host) {
    console.log(`option '-h, --host <host>' argument missing`)
  }
  createcontract(program.host, program.key)
    .then(data => {
      console.log(data)
    })
    .catch(err => {
      console.log(err)
    })
}
