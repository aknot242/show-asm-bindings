const Client = require("node-rest-client-promise").Client;
const jsonata = require("jsonata");
const chalk = require("chalk");
var client = Object();

exports.initClient = (args) => {
    const protocol = "https://";
    client = getClient();

    // registering remote methods
    client.registerMethodPromise("authenticate", `${protocol}${args.bigIp}/mgmt/shared/authn/login`, "POST");
    client.registerMethodPromise("getVirtualServers", `${protocol}${args.bigIp}/mgmt/tm/ltm/virtual/`, "GET");
    client.registerMethodPromise("getAsmPolicies", `${protocol}${args.bigIp}/mgmt/tm/asm/policies?$select=name,virtualServers,active,enforcementMode,id`, "GET");
    client.registerMethodPromise("getDeviceStatus", `${protocol}${args.bigIp}/mgmt/tm/cm/device/`, "GET");
}

exports.getAuthToken = (username, password) => new Promise((resolve, reject) => {
    let body = {
        "username": username,
        "password": password,
        "loginProviderName": "tmos"
    }
    client.methods.authenticate(getBodyArgs(body))
        .then((tokenResult) => {
            const token = safeAccess(() => tokenResult.data.token.token, "");

            // make a secondary call to ensure authorization
            client.methods.getDeviceStatus(getDefaultArgs(token))
                .then((statusResult) => {
                    if (statusResult.response.statusCode === 401) {
                        reject(new Error("Authorization failed. Aborting."));
                    }
                    else {
                        resolve(token);
                    }
                });
        });
});

exports.getVirtualServerNames = (token) => new Promise((resolve, reject) => {
    client.methods.getVirtualServers(getDefaultArgs(token))
        .then((result) => {
            const expression = jsonata("items.fullPath");
            const queryResult = expression.evaluate(result.data);
            let vServers = safeAccess(() => queryResult, new Array());
            resolve(vServers);
        })
        .catch((error) => reject(error));
});

exports.getAsmPolicies = (token) => new Promise((resolve, reject) => {
    client.methods.getAsmPolicies(getDefaultArgs(token))
        .then((result) => {
            let policies = safeAccess(() => result.data.items, new Array());
            resolve(policies);
        })
        .catch((error) => reject(error));
});

exports.exitProcessWithFailStatus = (message) => {
    console.log(chalk.bgRed(message));
    process.exit(1);
}


// private functions

function getClient() {
    var options = {
        connection: {
            rejectUnauthorized: false
        }
    }
    return new Client(options);
}

function getBodyArgs(bodyData, token) {
    var args = getDefaultArgs(token);
    args["data"] = bodyData;
    return args;
}

function getDefaultArgs(token) {
    var args = {
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token !== undefined && token !== "") {
        args.headers["X-F5-Auth-Token"] = token;
    }
    return args;
}

function safeAccess(func, fallbackValue) {
    try {
        return func();
    }
    catch (e) {
        return fallbackValue;
    }
}
