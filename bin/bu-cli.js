#!/usr/bin/env node

'use strict'

const program = require('commander')

const pkg = require('../package')

const VERSION = pkg.version
const DESCRIPTION = pkg.description

program
  .version(VERSION)
  .description(DESCRIPTION)
  .usage('[command] [options]')
  .command('atp60', 'publish ATP60 token or import SKU information')
  .parse(process.argv)
