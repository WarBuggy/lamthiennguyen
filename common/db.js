const configDb = require('../config/configDb.js');
const common = require('./common.js');
const mysql = require('mysql');

let connection = null;

module.exports = {
    query: function(sql, param, logSQL, logParam) {
        if (logSQL === true || configDb.logSQL == true) {
            console.log('SQL:');
            console.log(sql);
        }
        if (logParam === true || configDb.logParams === true) {
            console.log('Params:');
            console.log(param);
        }
        return new Promise(function(resolve) {
            module.exports.getConnection()
                .then(function(connection) {
                    let formatQuery = mysql.format(sql, param);
                    connection.query(formatQuery, async function(queryError, selectResult, fields) {
                        if (queryError) {
                            resolve({ success: false, message: queryError });
                            return;
                        }
                        let result = {
                            sqlResults: selectResult,
                            fields: fields,
                            success: true,
                        };
                        resolve(result);
                    });
                });
        });
    },


    getConnection: function() {
        return new Promise(function(resolve) {
            if (connection == null) {
                createConnection()
                    .then(function(result) {
                        connection = result;
                        resolve(result);
                    });
            } else {
                resolve(connection);
            }
        });
    },

    closeConnection: function() {
        if (connection == null) {
            common.consoleLog('Database connection does not exist.');
            return;
        }
        return new Promise(function(resolve) {
            try {
                connection.end();
                common.consoleLog('Database connection was closed successfully.');
                resolve();
            } catch (closingError) {
                common.consoleLogError('Error while closing database connection:\n' + closingError + '.');
                connection.destroy();
                resolve();
            }
        });
    },

    logPurpose: function(param, logInfoPurpose, logParam, logLogInfo) {
        if (logParam === true || configDb.logParams === true) {
            console.log('Purpose params:');
            console.log(param);
        }
        if (logLogInfo === true || configDb.logLogInfo === true) {
            console.log('Purpose log info:');
            console.log(logInfoPurpose);
        }
        return new Promise(function(resolve) {
            module.exports.getConnection()
                .then(function(connection) {
                    let sql = `INSERT INTO ${configDb.tableLogPurpose} (??, ??, ??, ??) VALUES (?,?,?,?)`
                    let paramQuery = [
                        'desc', 'token', 'ip', 'param',
                        logInfoPurpose.purpose,
                        logInfoPurpose.token,
                        logInfoPurpose.ip,
                        param.join(', '),
                    ];
                    let formatQuery = mysql.format(sql, paramQuery);
                    connection.query(formatQuery, function(logError, results) {
                        if (logError) {
                            let code = 900;
                            common.consoleLogDBError(`Could not log purpose to database. Error: ${logError}.`);
                            common.consoleLogPurposeError(`IP: ${logInfoPurpose.ip}, purpose: ${logInfoPurpose.purpose}, status: failed, code: ${code}.`);
                            resolve({ success: false, code, });
                            return;
                        }
                        common.consoleLogPurpose(`IP: ${logInfoPurpose.ip}, purpose: ${logInfoPurpose.purpose}, status: received id ${results.insertId}.`);
                        logInfoPurpose.id = results.insertId;
                        resolve({ success: true, });
                    });
                });
        });
    },

    updatePurpose: function(logInfoPurpose, code, message, log) {
        if (log === true || configDb.logLogInfo === true) {
            console.log('Purpose log info:');
            console.log(logInfoPurpose);
            console.log(`Code: ${code}`);
            console.log(`Message: ${message}`);
        }
        return new Promise(function(resolve) {
            module.exports.getConnection()
                .then(function(connection) {
                    let sql = `UPDATE ${configDb.tableLogPurpose} SET ?? = ?, ?? = ? WHERE ?? = ?`;
                    let paramQuery = [
                        'result',
                        code,
                        'message',
                        message,
                        'id',
                        logInfoPurpose.id,
                    ];
                    let formatQuery = mysql.format(sql, paramQuery);
                    connection.query(formatQuery, function(logError) {
                        let statusLogged = 'yes';
                        if (logError) {
                            statusLogged = 'no';
                            common.consoleLogDBError(`Could not update purpose (${logInfoPurpose.id}). Error: ${logError}.`);
                        }
                        if (code != 0) {
                            common.consoleLogPurposeError(`IP: ${logInfoPurpose.ip}, ` +
                                `purpose: ${logInfoPurpose.purpose} (${logInfoPurpose.id}), ` +
                                `status: failed, code: ${code}, message: ${message}, logged: ${statusLogged}.`);
                            resolve();
                            return;
                        }
                        common.consoleLogPurpose(`IP: ${logInfoPurpose.ip}, ` +
                            `purpose: ${logInfoPurpose.purpose} (${logInfoPurpose.id}), ` +
                            `status: success, message: ${message || ''}, logged: ${statusLogged}.`);
                        resolve();
                    });
                });
        });
    },

    createLogInfoPurpose: function(purpose, token, ip) {
        return {
            purpose,
            token,
            ip,
        };
    },

    logEmail: function(idPurpose, action, result, message) {
        return new Promise(function(resolve) {
            module.exports.getConnection()
                .then(function(connection) {
                    let sql = `INSERT INTO ${configDb.tableLogEmail} (??, ??, ??, ??) VALUES (?,?,?,?)`;
                    let paramQuery = [
                        'purpose', 'desc', 'message', 'result',
                        idPurpose,
                        action,
                        message,
                        result,
                    ];
                    let formatQuery = mysql.format(sql, paramQuery);
                    connection.query(formatQuery, function(logError) {
                        if (logError) {
                            common.consoleLogDBError(`Failed to log email (${action}, ${idPurpose}) ` +
                                `to database. Log error: '${logError}.`);
                            resolve(false);
                        }
                        resolve(true);
                    });

                });
        });
    },
};

function createConnection() {
    return new Promise(function(resolve) {
        let aConnection = mysql.createConnection({
            host: configDb.host,
            user: configDb.user,
            password: configDb.password,
            database: configDb.initDB,
            port: configDb.port,
        });
        aConnection.connect(function(connectionError) {
            if (connectionError) {
                common.consoleLogError('Error while connecting to database:\n' + connectionError + '.');
                resolve(null);
                return;
            } +

            common.consoleLog('Database connected with id ' + aConnection.threadId + '.');
            resolve(aConnection);
        });
    });
};

function logAction(param, logInfoAction, result, message) {
    return new Promise(function(resolve) {
        module.exports.getConnection()
            .then(function(connection) {
                let sql = `INSERT INTO ${configDb.tableLogAction} (??, ??, ??, ??, ??) VALUES (?,?,?,?,?)`;
                let paramQuery = [
                    'purpose', 'desc', 'param', 'message', 'result',
                    logInfoAction.idPurpose,
                    logInfoAction.action,
                    param.join(', '),
                    message,
                    result,
                ];
                let formatQuery = mysql.format(sql, paramQuery);
                connection.query(formatQuery, function(logError) {
                    if (logError) {
                        common.consoleLogDBError(`Failed to log action (${logInfoAction.action}, ${logInfoAction.idPurpose}) ` +
                            `to database. Log error: '${logError}.`);
                        resolve(false);
                    }
                    resolve(true);
                });

            });
    });
};