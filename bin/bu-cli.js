#!/usr/bin/env node

'use strict'

const colors = require('colors')
const commander = require('commander')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const readline = require('readline')
const program = new commander.Command()

const pkg = require('../package')
const lib = require('../lib')

const MODE_0666 = parseInt('0666', 8)
const MODE_0755 = parseInt('0755', 8)
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates')
const VERSION = pkg.version
const DESCRIPTION = pkg.description

const _exit = process.exit

process.exit = exit

program
  .name('bu-atp60')
  .version(VERSION)
  .description(DESCRIPTION)
  .usage('[options]')
  .option('-p, --publish', 'publish atp60')
  .option('-c, --create', 'create dir and initInput template')
  .option('-k, --key <key>', 'private key')
  .option('-i, --input <input>', 'input argument for atp60')
  .option('-d, --address <address>', 'atp60 address')
  .option('-H, --host <host>', 'atp60 address')
  .option('-n, --dirName <dir_name>', 'dir name')

program.on('--help', function () {
  console.log('')
  console.log(makeBlue('Examples:'))
  console.log('  # help')
  console.log(makeBlue('  $ bu-atp60 --help'))
  console.log(makeBlue('  $ bu-atp60 -h'))
  console.log('  # publish atp60')
  console.log(makeBlue('  $ bu-atp60 -p -H host -k private_key -i input_string'))
  console.log('')
})

program.parse(process.argv)

if (!exit.exited) {
  if (program.create) {
    if (!program.dirName) {
      console.log(colors.yellow(`option '-n, --dirName <dir_name>' argument missing`))
      _exit(1)
    }
    main(program.dirName)
  }
  // 发布合约
  if (program.publish) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-h, --host <host>' argument missing`))
    }
    const initInputPath = `initInput${path.sep}index.json`
    const initInputExists = fs.existsSync(path.join(process.cwd(), initInputPath))
    if (!initInputExists) {
      console.log(colors.red('initInput template is not exists'))
      _exit(1)
    }
    // 读取initInputTempate内容
    let initInput = fs.readFileSync(path.join(process.cwd(), initInputPath), 'utf-8')
    initInput = JSON.parse(initInput)
    lib.createContract(program.host, program.key, initInput)
      .then(data => {
        console.log(data)
      })
      .catch(err => {
        console.log(err)
      })
  }
}

function makeBlue (txt) {
  return colors.blue(txt)
}

/**
 * Main program.
 */

function main (name) {
  // Path
  // const destinationPath = program.args.shift() || '.'
  const destinationPath = name
  // App name
  const appName = createAppName(path.resolve(destinationPath)) || 'atp60'
  // Generate application
  emptyDirectory(destinationPath, function (empty) {
    if (empty || program.force) {
      createApplication(appName, destinationPath)
    } else {
      confirm('destination is not empty, continue? [y/N] ', function (ok) {
        if (ok) {
          process.stdin.destroy()
          createApplication(appName, destinationPath)
        } else {
          console.error('aborting')
          exit(1)
        }
      })
    }
  })
}

/**
 * Create application at the given directory.
 *
 * @param {string} name
 * @param {string} dir
 */

function createApplication (name, dir) {
  console.log()

  if (dir !== '.') {
    mkdir(dir, '.')
  }

  // copy initInput template
  mkdir(dir, 'initInput')
  copyTemplate('initInput/index.json', path.join(dir, 'initInput/index.json'))

  console.log()
}

/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */

function createAppName (pathName) {
  return path.basename(pathName)
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase()
}

/**
 * Check if the given directory `dir` is empty.
 *
 * @param {String} dir
 * @param {Function} fn
 */

function emptyDirectory (dir, fn) {
  fs.readdir(dir, function (err, files) {
    if (err && err.code !== 'ENOENT') throw err
    fn(!files || !files.length)
  })
}

/**
 * Graceful exit for async STDIO
 */

function exit (code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done () {
    if (!(draining--)) _exit(code)
  }

  let draining = 0
  const streams = [process.stdout, process.stderr]

  exit.exited = true

  streams.forEach(function (stream) {
    // submit empty write request and wait for completion
    draining += 1
    stream.write('', done)
  })

  done()
}

/**
 * Make the given dir relative to base.
 *
 * @param {string} base
 * @param {string} dir
 */

function mkdir (base, dir) {
  const loc = path.join(base, dir)

  console.log('   \x1b[36mcreate\x1b[0m : ' + loc + path.sep)
  mkdirp.sync(loc, MODE_0755)
}

/**
 * Prompt for confirmation on STDOUT/STDIN
 */

function confirm (msg, callback) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(msg, function (input) {
    rl.close()
    callback(/^y|yes|ok|true$/i.test(input))
  })
}

/**
 * Copy file from template directory.
 */

function copyTemplate (from, to) {
  write(to, fs.readFileSync(path.join(TEMPLATE_DIR, from), 'utf-8'))
}

/**
 * echo str > file.
 *
 * @param {String} file
 * @param {String} str
 */

function write (file, str, mode) {
  fs.writeFileSync(file, str, { mode: mode || MODE_0666 })
  console.log('   \x1b[36mcreate\x1b[0m : ' + file)
}
