const common = require("./common")
const chalk = require("chalk");

const argv = require("yargs")
    .usage("Usage: $0 --bigip [string] --username [string] --password [string]")
    .demand(["bigip"])
    .example("$0 --bigip bigip.example.com --username azureuser --password thisismypassword", "reports ASM status for each virtual server on a BIG-IP")
    .argv;

var ARGS = {
    bigIp: argv.bigip,
    username: argv.username,
    password: argv.password
}

if (ARGS.username === undefined || ARGS.password === undefined) common.exitProcessWithFailStatus(`Username or password not provided. Aborting.`);

common.initClient(ARGS);

common.getAuthToken(ARGS.username, ARGS.password)
    .then((token) => {

        console.log(`Auth token from ${ARGS.bigIp}: ${token}`);

        let getVsNamesPromise = common.getVirtualServerNames(token);

        let getAsmPoliciesPromise = common.getAsmPolicies(token);

        Promise.all([getVsNamesPromise, getAsmPoliciesPromise])
            .then((values) => {
                values[0].forEach((vServer) => {
                    let policy = values[1].find((x) => x.virtualServers.includes(vServer))
                    console.log(`VS ${vServer} ${policy === undefined
                        ? chalk.red('NO ASM POLICY')
                        : chalk.green(`ASM POLICY ${policy.name}`)}`);
                });
            });
    })
    .catch((error) => common.exitProcessWithFailStatus(error.message))
