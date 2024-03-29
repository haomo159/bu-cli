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
const moment = require('moment')
const pLimit = require('p-limit')
const program = new commander.Command()

const pkg = require('../package')
const lib = require('../lib')

const MODE_0666 = parseInt('0666', 8)
const MODE_0755 = parseInt('0755', 8)
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates')
const VERSION = pkg.version
const DESCRIPTION = pkg.description

const _exit = process.exit

// process.exit = exit

program
  .name('bu-atp61')
  .version(VERSION)
  .description(DESCRIPTION)
  .usage('[options]')
  .option('-p, --publish', 'publish atp61')
  .option('-c, --create', 'create dir and initInput template')
  .option('-g, --generate', 'generate account')
  .option('-N, --number <number>', 'number of account')
  .option('-i, --import', 'import sku information')
  .option('-k, --key <key>', 'private key')
  .option('-f, --file <file>', 'the path of csv file')
  .option('-d, --address <contract_address>', 'contract address')
  .option('-H, --host <host>', 'atp61 address')
  .option('-D, --dirName <dir_name>', 'dir name')
  .option('-s, --setAcceptance', 'set acceptance')

program.on('--help', function () {
  console.log('')
  console.log(colors.blue('Examples:'))
  console.log('  # help')
  console.log(colors.blue('  $ bu-atp61 -h'))
  console.log(colors.blue('  $ bu-atp61 --help'))
  console.log('  # version')
  console.log(colors.blue('  $ bu-atp61 -V'))
  console.log(colors.blue('  $ bu-atp61 --version'))
  console.log('  # create initialize directory')
  console.log(colors.blue('  $ bu-atp61 -c -D <dir_name>'))
  console.log('  # publish atp61 contract')
  console.log(colors.blue('  $ bu-atp61 -p -k <private_key> -H <host>'))
  console.log('  # generate multiple accounts')
  console.log(colors.blue('  $ bu-atp61 -g -k <private_key> -H <host> -N <number>'))
  console.log('  # set acceptance')
  console.log(colors.blue('  $ bu-atp61 -s -k <private_key> -H <host> -d <contract_address>'))
  console.log('  # import sku information')
  console.log(colors.blue('  $ bu-atp61 -i -k <private_key> -H <host> -d <contract_address> -f <path_of_csv_file>'))
  console.log('')
})

program.parse(process.argv)

if (!exit.exited) {
  // ====================================
  // create initialize directory
  // ====================================
  if (program.create) {
    if (!program.dirName) {
      console.log(colors.yellow(`option '-D, --dirName <dir_name>' argument missing`))
      _exit(1)
    }
    createDir(program.dirName)
  }

  // ====================================
  // publish atp61 contract
  // ====================================
  if (program.publish) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-H, --host <host>' argument missing`))
      _exit(1)
    }
    const initInputPath = `initInput${path.sep}index.json`
    const initInputExists = fs.existsSync(path.join(process.cwd(), initInputPath))
    if (!initInputExists) {
      console.log(colors.red('initInput template is not exists'))
      _exit(1)
    }
    // read initInput template content
    let initInput = fs.readFileSync(path.join(process.cwd(), initInputPath), 'utf-8')
    initInput = JSON.parse(initInput)
    lib.createContract(program.host, program.key, initInput)
      .then(data => {
        console.log()
        if (data.errorCode === 0) {
          const contractAddress = data.result.contractAddressList[0]['contract_address']
          console.log(`${colors.green('   contract address:')} ${contractAddress}`)
        } else {
          console.log(`${colors.yellow(JSON.stringify(data))}`)
        }
        console.log()
        console.log(colors.blue('   DONE'))
      })
      .catch(err => {
        console.log(err)
      })
  }

  // ====================================
  // generate multiple accounts
  // ====================================
  if (program.generate) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-H, --host <host>' argument missing`))
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
          // save account file
          const isExists = fs.existsSync(path.join(process.cwd(), 'accountInfo'))
          if (isExists) {
            let accountInfo = fs.readFileSync(path.join(process.cwd(), 'accountInfo'), 'utf-8')
            accountInfo = JSON.parse(accountInfo)
            accountInfo = accountInfo.concat(data.accountList)
            write(path.join(process.cwd(), 'accountInfo'), JSON.stringify(accountInfo))
          } else {
            write(path.join(process.cwd(), 'accountInfo'), accountListStr)
          }
          console.log()
          console.log(colors.blue('   DONE'))
        }
      })
      .catch(err => {
        console.log(err)
      })
  }

  // ====================================
  // import sku information
  // ====================================
  if (program.import) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-H, --host <host>' argument missing`))
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

    const skuInputPath = `skuInput${path.sep}index.json`
    const skuInputExists = fs.existsSync(path.join(process.cwd(), skuInputPath))
    if (!skuInputExists) {
      console.log(colors.red('skuInput template is not exists'))
      _exit(1)
    }
    // read initInput template content
    let skuInput = fs.readFileSync(path.join(process.cwd(), skuInputPath), 'utf-8')
    skuInput = JSON.parse(skuInput)

    const csvPath = path.join(process.cwd(), program.file)
    const results = []
    const csvPathIsExists = fs.existsSync(path.join(csvPath))

    if (!csvPathIsExists) {
      console.log(colors.yellow(`csv file not Exists`))
      _exit(1)
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        const isExists = fs.existsSync(path.join(process.cwd(), 'accountInfo'))
        if (!isExists) {
          console.log()
          console.log(colors.yellow(`accountInfo file not Exists`))
          console.log()
          _exit(1)
        } else {
          if (results.length === 0) {
            console.log()
            console.log(`  ${colors.yellow('csv file content cannot be empty')}`)
            console.log()
            _exit(1)
          }
          let filds = [
            'packageId',
            'tokenId',
            'brand',
            'category',
            'productCode',
            'listingDate',
            'size',
            'retailPrice'
          ]
          filds = JSON.stringify(filds.sort())
          let keys = Object.keys(results[0])
          keys = JSON.stringify(keys.sort())
          if (filds !== keys) {
            console.log()
            console.log(`  ${colors.yellow('csv file format is incorrect')}`)
            console.log()
            _exit(1)
          }
          // const startingTime = moment().format('YYYY-MM-DD HH:mm:ss')
          let accountList = fs.readFileSync(path.join(process.cwd(), 'accountInfo'), 'utf-8')
          accountList = JSON.parse(accountList)
          // const tmpArr = repeat(count)
          const newData = splitArray(results, accountList.length * 2)
          const retryCount = newData.length
          console.log()
          console.log(colors.green(`  start importing sku information ... ...`))
          console.log()
          setSku(newData, accountList, retryCount, skuInput)
            .then(data => {})
            .catch(err => {
              console.log(err)
            })
        }
      })
  }

  // ====================================
  // set acceptance
  // ====================================
  if (program.setAcceptance) {
    if (!program.key) {
      console.log(colors.yellow(`option '-k, --key <key>' argument missing`))
      _exit(1)
    }
    if (!program.host) {
      console.log(colors.yellow(`option '-H, --host <host>' argument missing`))
      _exit(1)
    }
    if (!program.address) {
      console.log(colors.yellow(`option '-d, --address <file>' argument missing`))
      _exit(1)
    }
    const acceptanceInputPath = `acceptanceInput${path.sep}index.json`
    const acceptanceInputExists = fs.existsSync(path.join(process.cwd(), acceptanceInputPath))
    if (!acceptanceInputExists) {
      console.log(colors.red('   acceptanceInput template is not exists'))
      _exit(1)
    }
    // read acceptanceInput template content
    let acceptanceInput = fs.readFileSync(path.join(process.cwd(), acceptanceInputPath), 'utf-8')
    acceptanceInput = JSON.parse(acceptanceInput)
    lib.setAcceptance({
      host: program.host,
      privateKey: program.key,
      contractAddress: program.address,
      acceptanceInput: acceptanceInput
    })
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
const setSku = async (data, accountList, retryCount, skuInput) => {
  const limit = pLimit(10)
  while (retryCount > 0) {
    const rows = data.splice(0, 1)
    const promiseArray = []
    for (let index in accountList) {
      if (Array.isArray(rows) &&
        rows[0] !== undefined &&
        rows[0].length > 0) {
        const data = rows[0].splice(0, 2)
        promiseArray.push(limit(() => {
          return lib.createSku({
            host: program.host,
            privateKey: program.key,
            contractAddress: program.address,
            data: data,
            submitPrivateKey: accountList[ index ]['privateKey'],
            submitAddress: accountList[ index ]['address'],
            params: skuInput
          })
        }))
      }
    }
    const startingTime = moment().format('YYYY-MM-DD HH:mm:ss')
    Promise.all(promiseArray)
      .then(data => {
        const endTime = moment().format('YYYY-MM-DD HH:mm:ss')
        const takesTime = moment(endTime).diff(startingTime, 'seconds')
        console.log()
        console.log(colors.blue(`  =================== queue detail: ===================`))
        if (Array.isArray(data) && data.length > 0) {
          data.forEach(item => {
            if (item.errorCode === 0) {
              console.log(`  ${colors.green('[SUCCESS]')} the hash is: ${JSON.stringify(item.result.hash)}`)
            } else {
              console.log(`  ${colors.red('[failure]')} the token is: ${JSON.stringify(item)}`)
              // console.log(`  ${colors.red('[failure]')} the token is: ${JSON.stringify(item.tokenList)}`)
            }
          })
        }
        console.log()
        console.log(`  ${colors.blue('starting time:')} ${startingTime}`)
        console.log(`  ${colors.blue('end time:')}      ${endTime}`)
        console.log(`  ${colors.blue('it takes:')}      ${takesTime} seconds`)
        console.log()
      })
      .catch(err => {
        console.log(`  ${colors.yellow('network anomaly')}`)
      })
    await sleepSeconds(60)
    retryCount = retryCount - 1
  }
  return 'DONE'
}

/**
 * create initialize directory
 */

function createDir (name) {
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
      confirm(colors.yellow('destination is not empty, continue? [y/N] '), function (ok) {
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

  // copy acceptanceInput template
  mkdir(dir, 'acceptanceInput')
  copyTemplate('acceptanceInput/index.json', path.join(dir, 'acceptanceInput/index.json'))

  // copy sku template
  mkdir(dir, 'skuInput')
  copyTemplate('skuInput/index.json', path.join(dir, 'skuInput/index.json'))

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

  console.log(colors.blue('   create : ') + loc + path.sep)
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
  console.log(colors.blue('   create : ') + file)
}
