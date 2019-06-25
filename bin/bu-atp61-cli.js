#!/usr/bin/env node

'use strict'

const colors = require('colors')
const commander = require('commander')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const readline = require('readline')
const csv = require('csv-parser')
const splitArray = require('split-array')
const sleepSeconds = require('sleepjs').sleepSeconds
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
  .name('bu-atp61')
  .version(VERSION)
  .description(DESCRIPTION)
  .usage('[options]')
  .option('-p, --publish', 'publish atp61')
  .option('-c, --create', 'create dir and initInput template')
  .option('-g, --generate', 'generate account')
  .option('-N, --number <number>', 'number of account')
  .option('-i, --input', 'import sku information')
  .option('-k, --key <key>', 'private key')
  .option('-f, --file <file>', 'the path of csv file')
  .option('-d, --address <contract_address>', 'contract address')
  .option('-H, --host <host>', 'atp61 address')
  .option('-D, --dirName <dir_name>', 'dir name')
  .option('-t, --test', 'for test')

program.on('--help', function () {
  console.log('')
  console.log(makeBlue('Examples:'))
  console.log('  # help')
  console.log(makeBlue('  $ bu-atp61 --help'))
  console.log(makeBlue('  $ bu-atp61 -h'))
  console.log('  # initialize directory')
  console.log(makeBlue('  $ bu-atp61 -c -D <dir_name>'))
  console.log('  # publish atp61 contract')
  console.log(makeBlue('  $ bu-atp61 -p -H host -k private_key -i input_string'))
  console.log('  # generate multiple accounts')
  console.log(makeBlue('  $ bu-atp61 -g -k <private_key> -H <host> -N <number'))
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
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-h, --host <host>' argument missing`))
      _exit(1)
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
  // 批量创建账户(一次50个账户)
  if (program.generate) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-h, --host <host>' argument missing`))
      _exit(1)
    }
    if (!program.number) {
      console.log(colors.yellow(`option '-N, --number <number>' argument missing`))
      _exit(1)
    }
    lib.generateAccount(program.host, program.key, program.number)
      .then(data => {
        if (data.transactionInfo.errorCode === 0) {
          const accountListStr = JSON.stringify(data.accountList)
          // 存储账户文件
          const isExists = fs.existsSync(path.join(process.cwd(), 'accountInfo'))
          if (isExists) {
            let accountInfo = fs.readFileSync(path.join(process.cwd(), 'accountInfo'), 'utf-8')
            accountInfo = JSON.parse(accountInfo)
            accountInfo = accountInfo.concat(data.accountList)
            write(path.join(process.cwd(), 'accountInfo'), JSON.stringify(accountInfo))
          } else {
            write(path.join(process.cwd(), 'accountInfo'), accountListStr)
          }
        }
      })
      .catch(err => {
        console.log(err)
      })
  }
  // 导入sku信息
  if (program.input) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-h, --host <host>' argument missing`))
      _exit(1)
    }
    if (!program.address) {
      console.log(colors.yellow(`option '-d, --address <file>' argument missing`))
      _exit(1)
    }
    if (!program.file) {
      console.log(colors.yellow(`option '-f, --file <file>' argument missing`))
      _exit(1)
    }
    const csvPath = path.join(process.cwd(), program.file)
    const results = []

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        const isExists = fs.existsSync(path.join(process.cwd(), 'accountInfo'))
        if (!isExists) {
          console.log(colors.yellow(`accountInfo file not Exists`))
          _exit(1)
        } else {
          let accountList = fs.readFileSync(path.join(process.cwd(), 'accountInfo'), 'utf-8')
          accountList = JSON.parse(accountList)
          // const tmpArr = repeat(count)
          const newData = splitArray(results, accountList.length * 2)
          const retryCount = newData.length
          setSku(newData, accountList, retryCount)
            .then(data => {
              console.log('====== bof: 111111111111')
              console.log(data)
              console.log('====== eof: 111111111111')
            })
            .catch(err => {
              console.log(err)
            })
        }
      })
  }

  // 创建承兑信息
  if (program.test) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-h, --host <host>' argument missing`))
      _exit(1)
    }
    if (!program.address) {
      console.log(colors.yellow(`option '-d, --address <file>' argument missing`))
      _exit(1)
    }
    lib.setAcceptance(program.host, program.key, program.address)
      .then(data => {
        console.log(data)
      })
      .catch(err => {
        console.log(err)
      })
  }
}

/**
 * set sku information
 * @param {Array} data
 * @param {Array} accountList
 * @param {Number} retryCount
 * @returns {Promise<string>}
 */
const setSku = async (data, accountList, retryCount) => {
  while (retryCount > 0) {
    console.log(colors.blue(`=================== current queue: (${retryCount}) ===================`))
    console.log(colors.blue(`=================== current queue: ${retryCount} ===================`))
    for (let index in accountList) {
      const rows = data.splice(0, 1)
      if (Array.isArray(rows) &&
        rows[0] !== undefined &&
        rows[0].length > 0) {
        const info = await lib.createSku({
          host: program.host,
          privateKey: program.key,
          contractAddress: program.address,
          data: rows[0].splice(0, 2),
          submitPrivateKey: accountList[ index ]['privateKey'],
          submitAddress: accountList[ index ]['address']
        })

        if (info.errorCode !== 0) {
          console.log(`${colors.red('[failure]')} the token is: ${JSON.stringify(info.tokenList)}`)
        } else {
          console.log(`${colors.green('[SUCCESS]')} the hash is: ${JSON.stringify(info.result.hash)}`)
        }
      }
    }
    await sleepSeconds(20)
    retryCount = retryCount - 1
  }
  return 'set sku information finished'
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
  const appName = createAppName(path.resolve(destinationPath)) || 'atp61'
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
