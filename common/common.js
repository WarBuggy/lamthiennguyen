const label = require('../label/label.js');
const configSystem = require('../config/configSystem.js');

const fs = require('fs-extra');
const dayjs = require('dayjs');
const dayjsCustomParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(dayjsCustomParseFormat);
let dayjsWeekOfYear = require('dayjs/plugin/weekOfYear');
dayjs.extend(dayjsWeekOfYear);

module.exports = {
    getCurrentTime: function() {
        return dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    getReadableIP: function(request) {
        let ip = request.headers['x-real-ip'];
        if (ip == null) {
            let parts = (request.connection.remoteAddress + '').split(':');
            return parts.pop();
        }
        return ip.toString();
    },

    sleep: function(ms) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve();
            }, ms);
        });
    },

    consoleLog: function(string, consoleColor, time) {
        if (consoleColor == null) {
            consoleColor = configSystem.consoleColor;
        }
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        console.log(consoleColor + '%s\x1b[0m', time + ': ' + string);
    },

    consoleLogError: function(string, consoleColor, time) {
        if (consoleColor == null) {
            consoleColor = configSystem.consoleColorError;
        }
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        console.log(consoleColor + '%s\x1b[0m', time + ': ' + string);
    },

    consoleLogPurpose: function(string, time) {
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        module.exports.consoleLog(string, configSystem.consoleColorPurpose, time);
    },

    consoleLogPurposeError: function(string, time) {
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        module.exports.consoleLog(string, configSystem.consoleColorPurpose, time);
    },

    consoleLogAction: function(string, time) {
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        module.exports.consoleLog(string, configSystem.consoleColorAction, time);
    },

    consoleLogActionError: function(string, time) {
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        module.exports.consoleLog(string, configSystem.consoleColorAction, time);
    },

    consoleLogDBError: function(string, time) {
        if (time == null) {
            time = module.exports.getCurrentTime();
        }
        module.exports.consoleLog(string, configSystem.consoleColorDB, time);
    },

    cloneObject: function(object) {
        let string = JSON.stringify(object);
        return JSON.parse(string);
    },

    isNumeric: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    validateEmail: function(input) {
        let re =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(input).toLowerCase());
    },

    checkNumericString: function(input) {
        for (let i = 0; i < input.length; i++) {
            if (!'0123456789'.includes(input[i])) {
                return false;
            }
        }
        return true;
    },

    loadFile: function(path) {
        let contentObject = {};
        fs.readdirSync(path).forEach(function(file) {
            let filePath = path + '/' + file;
            if (!fs.statSync(filePath).isDirectory()) {
                let part = file.split('.');
                let contentFile = fs.readFileSync(filePath, { encoding: 'utf8', });
                contentFile = module.exports.processStringLabel(contentFile);
                contentObject[part[0]] = contentFile;
            }
        });
        return contentObject;
    },

    getLabel: function(labelName, values, language) {
        let localLabel = null;
        if (configSystem.reloadLabel) {
            delete require.cache[require.resolve('../label/label.js')];
            localLabel = require('../label/label.js').label;
        } else {
            localLabel = label.label;
        }
        let languageList = ['vi', 'en'];
        if (language == null || !languageList.includes(language)) {
            language = 'vi';
        }
        let result = (localLabel[labelName] || {})[language] || `{{{${labelName}}}}`;
        if (values != null) {
            for (let i = 0; i < values.length; i++) {
                result = result.replace(`{${i}}`, values[i]);
            }
        }
        return result;
    },

    processStringLabel: function(string) {
        string = string.replace(/{{{.*}}}/g, function(match) {
            let labelName = match.replace(/{{{/, '').replace(/}}}/, '');
            return module.exports.getLabel(labelName);
        });
        return string;
    },

    decodeBase64: function(base64String) {
        return Buffer.from(base64String, 'base64').toString('ascii');
    },

    encodeBase64: function(string) {
        return Buffer.from(string).toString('base64');
    },

    handleRequestStageInit: async function(purpose, request, response) {
        let result = await RequestHandleStateInit.requestHandleStateInit(purpose, request, response);
        return {
            objectLog: result.objectLog,
            param: result.param,
            infoUser: result.infoUser,
        };
    },
};

class RequestHandleStateInit {
    static async requestHandleStateInit(purpose, request, response) {
        let objectLog = RequestHandleStateInit.createObjectLog(purpose, request);

        let actionResult = RequestHandleStateInit.processRequestPageParam(request, objectLog);
        objectLog.action.push(actionResult.action);
        let param = actionResult.result;

        actionResult = await RequestHandleStateInit.handleRequestPageCookie(request, response, objectLog);
        let infoUser = actionResult.result;

        console.log('objectLog');
        console.log(objectLog);
        console.log('pageParam');
        console.log(param);
        console.log('infoUser');
        console.log(infoUser);
        return { objectLog, param, infoUser, };
    };

    static createObjectLog(purpose, request) {
        let requestIp = module.exports.getReadableIP(request);
        let objectLog = {
            desc: purpose,
            ip: requestIp,
            time: module.exports.getCurrentTime(),
            action: [],
        };
        return objectLog;
    };

    static processRequestPageParam(request) {
        let param = request.query.param;
        let result = {
            action: {
                desc: 'process query param',
                param: null,
                message: '',
                code: null,
            },
            result: {},
        };
        if (param == null) {
            result.action.code = 1;
            result.action.param = 'null';
            result.action.message = 'no param';
            return result;
        }
        let string = module.exports.decodeBase64(param.toString().trim());
        result.action.param = string;
        if (string == '') {
            result.action.code = 2;
            result.action.message = 'empty param';
            return result;
        }
        try {
            let json = JSON.parse(string);
            result.result = json;
            result.action.code = 0;
            return result;
        } catch (error) {
            result.action.code = 3;
            result.action.message = 'cannot convert json';
            return result;
        }
    };

    static async handleRequestPageCookie(request, response, objectLog) {
        let actionResult = RequestHandleStateInit.retrieveRequestCookie(request, response);
        objectLog.action.push(actionResult.action);
        if (actionResult.action.code != 0) {
            return { success: false, };
        }
        let serial = actionResult.result.serial;
        let hash = actionResult.result.hash;

        actionResult = await RequestHandleStateInit.getIdAndToken(serial);
        objectLog.action.push(actionResult.action);
        if (actionResult.action.code != 0) {
            return { success: false, };
        }
        let idUser = actionResult.result.idUser;
        let token = actionResult.result.token;

        actionResult = await RequestHandleStateInit.compareStringAndHash(token, hash);
        objectLog.action.push(actionResult.action);
        if (actionResult.action.code != 0) {
            return { success: false, };
        }

        actionResult = await RequestHandleStateInit.getUserInfo(idUser);
        objectLog.action.push(actionResult.action);
        if (actionResult.action.code != 0) {
            return { success: false, };
        }
        let data = actionResult.result;
        data.idUser = idUser;
        data.token = token;
        data.serial = serial;
        return { success: true, result: data, };
    };


    static retrieveRequestCookie(request, response) {
        let result = {
            action: {
                desc: 'retreive request cookie',
                param: null,
                message: '',
                code: null,
            },
            result: null,
        };

        if (request.cookies == null || request.cookies.data == null) {
            result.action.param = 'null';
            result.action.code = 1;
            result.action.message = 'no cookie data';
            return result;
        }

        let dataCookie = request.cookies.data.toString().trim();
        result.action.param = dataCookie;
        let part = dataCookie.split(configSystem.cookieSeparator);
        if (part.length != 2) {
            response.clearCookie('data');
            result.action.code = 2;
            result.action.message = 'bad cookie data';
            return result;
        }
        let serial = part[0];
        let hash = part[1];
        result.action.code = 0;
        result.result = { serial, hash, };
        return result;
    };

    static async getIdAndToken(serial) {
        let sql = `SELECT ??, ??  FROM ??.?? WHERE ?? = ? AND ?? > NOW()`;
        let param = [
            'user',
            'token',
            configDb.schemaCredential,
            'token',
            'serial',
            serial,
            'expire',
        ];
        let result = {
            action: {
                desc: 'retrieve id and token',
                param: serial,
                message: '',
                code: null,
            },
            result: null,
        };
        let resultQuery = await db.query(sql, param);
        if (!resultQuery.success) {
            result.action.code = 1;
            result.action.message = `database error (${resultQuery.message})`;
            return result;
        }
        if (resultQuery.sqlResults[0] == null) {
            result.action.code = 2;
            result.action.message = 'no such serial';
            return result;
        }
        let idUser = resultQuery.sqlResults[0].user;
        let token = resultQuery.sqlResults[0].token;
        result.action.code = 0;
        result.result = { idUser, token, };
        return result;
    };

    static async compareStringAndHash(token, hash) {
        let result = {
            action: {
                desc: 'compare string and hash',
                param: [token, hash, ],
                message: '',
                code: null,
            },
        };
        let resultCompare = await cryptoCS.compareStringAndHash(token, hash);
        if (!resultCompare.success) {
            result.action.code = 1;
            result.action.message = `could not compare token and hash: ${resultCompare.message}`;
            return result;
        }
        if (!resultCompare.result) {
            result.action.code = 2;
            result.action.message = 'bad token and hash';
            return result;
        }
        result.action.code = 0;
        return result;
    };

    static async getUserInfo(idUser) {
        let sql = `SELECT ??, ??, ??  FROM ??.?? WHERE ?? = ?`;
        let param = [
            'name_first',
            'name_middle',
            'name_last',
            configDb.schemaCredential,
            'user',
            'id',
            idUser,
        ];
        let result = {
            action: {
                desc: 'retrieve user info from cookie data',
                param: idUser,
                message: '',
                code: null,
            },
            result: null,
        };
        let resultQuery = await db.query(sql, param);
        if (!resultQuery.success) {
            result.action.code = 1;
            result.action.message = `database error (${resultQuery.message})`;
            return result;
        }
        if (resultQuery.sqlResults[0] == null) {
            result.action.code = 2;
            result.action.message = 'no such user id';
            return result;
        }
        let data = {
            nameFirst: resultQuery.sqlResults[0].name_first,
            nameMiddle: resultQuery.sqlResults[0].name_middle,
            nameLast: resultQuery.sqlResults[0].name_last,
        };
        result.action.code = 0;
        result.result = data;
        return result;
    };
};