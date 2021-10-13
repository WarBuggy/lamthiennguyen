const configSystem = require('../config/configSystem.js');

const common = require('../common/common.js');
const cryptoCS = require('../common/crypto.js');

const fs = require('fs-extra');

// const template = require('../template.js');
// const db = require('../../common/db.js');
// const commonPage = require('../commonPage.js');
// const dayjs = require('dayjs');
// const dayjsCustomParseFormat = require('dayjs/plugin/customParseFormat');
// dayjs.extend(dayjsCustomParseFormat);
// let dayjsWeekOfYear = require('dayjs/plugin/weekOfYear');
// const system = require('../../config/system.js');
// dayjs.extend(dayjsWeekOfYear);


module.exports = function(app) {
    app.get('/', function(request, response) {
        response.redirect('/index.html');
    });

    app.get('/index.html', async function(request, response) {
        let purpose = 'html page index';
        await handleRequestPageStageInit(purpose, request, response);

        let html = getContent(app, ['html', 'index'], 'page/html/index.html');
        response.send(html);

        // let action = 'get user info from cookie';
        // let actionResult = await commonPage.getInfoUser(request, response, logInfoPurpose);
        // if (!actionResult.success) {
        //     common.consoleLogAction(`IP: ${requestIp.ip}, purpose: ${logInfoPurpose.id}, ` +
        //         `action: ${action}, status: failed, message: ${actionResult.message}.`);
        // }
        // let infoUser = actionResult.data;

        // let html = await template.createContentText(app, 'index');
        // html = await template.createHTMLHeader(app, infoUser, html, 'index.html', request.query.paramPage || '');
        // response.send(html);

        // if (configSystem.skipDBLoading !== true) {
        //     db.updatePurpose(logInfoPurpose, 0);
        // }
    });
};

function getContent(app, key, filePath) {
    if (configSystem.reloadContent) {
        let contentFile = fs.readFileSync(filePath, { encoding: 'utf8', });
        contentFile = common.processContentFile(contentFile);
        return contentFile;
    }

    let data = app.get('data');
    for (let i = 0; i < key.length; i++) {
        data = data[key[i]];
    }
    let contentFile = common.processContentFile(data);
    return contentFile;
};

function createObjectLog(purpose, request) {
    let requestIp = common.getReadableIP(request);
    let objectLog = {
        desc: purpose,
        ip: requestIp,
        time: common.getCurrentTime(),
        action: [],
    };
    return objectLog;
};

async function handleRequestPageStageInit(purpose, request, response) {
    let objectLog = createObjectLog(purpose, request);

    let actionResult = processRequestPageParam(request, objectLog);
    objectLog.action.push(actionResult.action);
    let param = actionResult.result;

    actionResult = await handleRequestPageCookie(request, response, objectLog);
    let infoUser = actionResult.result;

    console.log(objectLog);
    console.log(param);
    console.log(infoUser);
};

async function handleRequestPageCookie(request, response, objectLog) {
    let actionResult = retrieveRequestCookie(request, response);
    objectLog.action.push(actionResult.action);
    if (actionResult.action.code != 0) {
        return { success: false, };
    }
    let serial = actionResult.result.serial;
    let hash = actionResult.result.hash;

    actionResult = await getIdAndToken(serial);
    objectLog.action.push(actionResult.action);
    if (actionResult.action.code != 0) {
        return { success: false, };
    }
    let idUser = actionResult.result.idUser;
    let token = actionResult.result.token;

    actionResult = await compareStringAndHash(token, hash);
    objectLog.action.push(actionResult.action);
    if (actionResult.action.code != 0) {
        return { success: false, };
    }

    actionResult = await getUserInfo(idUser);
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

function processRequestPageParam(request) {
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
    let string = common.decodeBase64(param.toString().trim());
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

function retrieveRequestCookie(request, response) {
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

async function getIdAndToken(serial) {
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

async function compareStringAndHash(token, hash) {
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

async function getUserInfo(idUser) {
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