const configDb = require('../config/configDb.js');
const configSystem = require('../config/configSystem.js');

const common = require('../common/common.js');
const db = require('../common/db.js');
const cryptoCS = require('../common/crypto.js');
//const mailer = require('../common/mailer.js');

const passwordStrength = require('check-password-strength');
const dayjs = require('dayjs');
const dayjsCustomParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(dayjsCustomParseFormat);
let dayjsWeekOfYear = require('dayjs/plugin/weekOfYear');
dayjs.extend(dayjsWeekOfYear);

const cookieMaxAge = configSystem.cookieExpireInDay * 24 * 60 * 60 * 1000;

module.exports = function(app) {
    app.post('/api/register/user/code/email', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'user register email code';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let param = common.createObjectParam(request.body);
        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);

        let logPurposeResult = await db.logPurpose(Object.values(param), logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let checkParamResult = await checkRegisterUserEmailCodeParam(param, logInfoPurpose);
        if (!checkParamResult.success) {
            let code = 600 + checkParamResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, checkParamResult.message);
            return;
        }

        let stringRandom = await cryptoCS.generateRandomString(10);
        let saveResult = await saveEmailAndCode(stringRandom, param, logInfoPurpose);
        if (!saveResult.success) {
            let code = 610;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, 'could not save register user email and code');
            return;
        }

        let templateEmailStandardConfirmCode =
            createEmailStandardConfirmCodeContent(stringRandom, request.body.language,
                'email_standard_confirm_code_title', 'email_standard_confirm_code_body');
        let actionEmail = 'send register user email confirm code';
        let logInfoEmail = {
            idPurpose: logInfoPurpose.id,
            ip: logInfoPurpose.ip,
            action: actionEmail,
        };
        let mailerResult = await mailer.sendMailStandard(
            templateEmailStandardConfirmCode.title, templateEmailStandardConfirmCode.content,
            false, [param.email], true, logInfoEmail);
        if (!mailerResult.success) {
            let code = 620;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not ${actionEmail}: ${mailerResult.message}`);
            return;
        }

        let resJson = { success: true, };
        response.json(resJson);
        db.updatePurpose(logInfoPurpose, 0);
    });

    app.post('/api/register/user', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'user registration';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let param = common.createObjectParam(request.body);
        param.nameMiddle = common.convertToEmptyStringIfNull(param.nameMiddle);
        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);

        let logPurposeResult = await db.logPurpose(Object.values(param), logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let checkParamResult = await checkRegisterUserParam(param, logInfoPurpose);
        if (!checkParamResult.success) {
            let code = 600 + checkParamResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, checkParamResult.message);
            return;
        }

        let hashResult = await cryptoCS.hashPasswordUser(param.password);
        if (!hashResult.success) {
            let code = 610;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not hash password, error: ${hashResult.message}`);
            return;
        }
        param.password = hashResult.hash;

        let saveResult = await saveRegistrationData(param, logInfoPurpose);
        if (!saveResult.success) {
            let code = 620;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not save registration user data`);
            return;
        }
        let resJson = { success: true, };
        response.json(resJson);

        let deleteResult = await deleteEmailConfirmCode(param, logInfoPurpose);
        if (!deleteResult.success) {
            db.updatePurpose(logInfoPurpose, code, `could not delete email confirm code`);
            return;
        }
        db.updatePurpose(logInfoPurpose, 0);
    });

    app.post('/api/forget/password/user/code/email', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'forget  email code';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let param = common.createObjectParam(request.body);
        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);

        let logPurposeResult = await db.logPurpose(Object.values(param), logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let checkParamResult = await checkForgetPasswordEmailCodeParam(param, logInfoPurpose);
        if (!checkParamResult.success) {
            let code = 600 + checkParamResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, checkParamResult.message);
            return;
        }

        let stringRandom = await cryptoCS.generateRandomString(10);
        let saveResult = await saveEmailAndCode(stringRandom, param, logInfoPurpose);
        if (!saveResult.success) {
            let code = 610;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, 'could not save forget password email and code');
            return;
        }

        let templateEmailStandardConfirmCode =
            createEmailStandardConfirmCodeContent(stringRandom, request.body.language,
                'email_standard_confirm_code_title', 'email_forget_password_confirm_code_body');
        let actionEmail = 'send forget password email confirm code';
        let logInfoEmail = {
            idPurpose: logInfoPurpose.id,
            ip: logInfoPurpose.ip,
            action: actionEmail,
        };
        let mailerResult = await mailer.sendMailStandard(
            templateEmailStandardConfirmCode.title, templateEmailStandardConfirmCode.content,
            false, [param.email], true, logInfoEmail);
        if (!mailerResult.success) {
            let code = 620;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not ${actionEmail}: ${mailerResult.message}`);
            return;
        }

        let resJson = { success: true, };
        response.json(resJson);
        db.updatePurpose(logInfoPurpose, 0);
    });

    app.post('/api/forget/password/user', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'change forget password';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let param = common.createObjectParam(request.body);
        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);

        let logPurposeResult = await db.logPurpose(Object.values(param), logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let checkParamResult = await checkForgetPasswordUserParam(param, logInfoPurpose);
        if (!checkParamResult.success) {
            let code = 600 + checkParamResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, checkParamResult.message);
            return;
        }

        let hashResult = await cryptoCS.hashPasswordUser(param.password);
        if (!hashResult.success) {
            let code = 610;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not hash password, error: ${hashResult.message}`);
            return;
        }
        param.password = hashResult.hash;

        let saveResult = await changeForgetPassword(param, logInfoPurpose);
        if (!saveResult.success) {
            let code = 620;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, `could not change forget password`);
            return;
        }
        let resJson = { success: true, };
        response.json(resJson);

        let deleteResult = await deleteEmailConfirmCode(param, logInfoPurpose);
        if (!deleteResult.success) {
            db.updatePurpose(logInfoPurpose, code, `could not delete email confirm code`);
            return;
        }
        db.updatePurpose(logInfoPurpose, 0);
    });

    app.post('/api/login/user', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'login user';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let param = common.createObjectParam(request.body);
        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);

        let logPurposeResult = await db.logPurpose(Object.values(param), logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let checkParamResult = await checkLoginUserParam(param, logInfoPurpose);
        if (!checkParamResult.success) {
            let code = 600 + checkParamResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, checkParamResult.message);
            return;
        }

        let action = 'get data from email';
        let actionResult = await getDataFromEmail(param, logInfoPurpose, action);
        if (!actionResult.success) {
            let code = 620 + actionResult.code;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, actionResult.message);
            return;
        }

        let compareResult = await cryptoCS.compareStringAndHash(request.body.password, actionResult.hash);
        if (!compareResult.success) {
            let code = 630;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, 'could not compare password and hash');
            return;
        } else if (!compareResult.result) {
            let code = 640;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, 'wrong email or password');
            return;
        }

        let generateResult = await generateSerialTokenHash();
        if (!generateResult.success) {
            let code = 650;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, 'could not generate login user serial, token and hash');
            return;
        }

        let paramSave = {
            serial: generateResult.serial,
            token: generateResult.token,
            id: actionResult.id,
            userAgent: request.useragent.source,
        };
        let actionSave = 'save login user token and serial to database';
        let saveResult = await saveLoginToken(paramSave, logInfoPurpose, actionSave);
        if (!saveResult.success) {
            let code = 660;
            response.status(code).json({ success: false, });
            db.updatePurpose(logInfoPurpose, code, saveResult.saveResult);
            return;
        }

        createReponseCookie(generateResult.serial, generateResult.hash, response);
        let resJson = {
            success: true,
            nameFirst: actionResult.nameFirst,
            nameMiddle: actionResult.nameMiddle,
            nameLast: actionResult.nameLast,
        };
        response.json(resJson);
        db.updatePurpose(logInfoPurpose, 0);
    });

    app.post('/api/logout/user', async function(request, response) {
        let requestIp = common.getReadableIP(request);
        let purpose = 'logout user';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);
        let logPurposeResult = await db.logPurpose([], logInfoPurpose);
        if (!logPurposeResult.success) {
            response.status(logPurposeResult.code).json({ success: false, });
            return;
        };

        let action = 'get user info from cookie';
        let actionResult = await commonPage.getInfoUser(request, response, logInfoPurpose);
        if (!actionResult.success) {
            common.consoleLogAction(`IP: ${requestIp.ip}, purpose: ${logInfoPurpose.id}, ` +
                `action: ${action}, status: failed, message: ${actionResult.message}.`);
        }
        let infoUser = actionResult.data;

        if (infoUser != null) {
            action = 'delete token data';
            actionResult = await deleteToken(infoUser.serial, logInfoPurpose, action);
            if (!actionResult.success) {
                common.consoleLogAction(`IP: ${requestIp.ip}, purpose: ${logInfoPurpose.id}, ` +
                    `action: ${action}, status: failed, message: ${actionResult.message}.`);
                return;
            }
        };
        response.clearCookie('data');

        response.json({ success: true, });
        db.updatePurpose(logInfoPurpose, 0);
    });
};

async function checkRegisterUserEmailCodeParam(param, logInfoPurpose) {
    if (!common.checkNullOrEmptyString(param)) {
        return {
            success: false,
            code: 0,
            message: 'null or empty param',
        };
    }
    if (!common.validateEmail(param.email)) {
        return {
            success: false,
            code: 1,
            message: 'invalid email',
        };
    }
    let countEmailResult = await countEmail(param.email, logInfoPurpose);
    if (!countEmailResult.success) {
        return {
            success: false,
            code: 2,
            message: 'could not count email',
        };
    }
    if (countEmailResult.count != 0) {
        return {
            success: false,
            code: 3,
            message: 'email is taken',
        };
    }
    return { success: true };
};

async function checkRegisterUserParam(param, logInfoPurpose) {
    if (!common.checkNullOrEmptyString(param, ['nameMiddle'])) {
        return {
            success: false,
            code: 0,
            message: 'null or empty param',
        };
    }
    if (!common.validateEmail(param.email)) {
        return {
            success: false,
            code: 1,
            message: 'invalid email',
        };
    }
    if (!checkPasswordStrength(param.password)) {
        return {
            success: false,
            code: 2,
            message: 'weak password',
        };
    }
    let countEmailResult = await countEmail(param.email, logInfoPurpose);
    if (!countEmailResult.success) {
        return {
            success: false,
            code: 3,
            message: 'could not count email',
        };
    }
    if (countEmailResult.count != 0) {
        return {
            success: false,
            code: 4,
            message: 'email is taken',
        };
    }
    let checkEmailConfirmCodeResult =
        await countEmailConfirmCode(param.email, param.emailConfirm, logInfoPurpose);
    if (!checkEmailConfirmCodeResult.success) {
        return {
            success: false,
            code: 5,
            message: 'could not count email to confirm code',
        };
    }
    if (checkEmailConfirmCodeResult.count != 1) {
        return {
            success: false,
            code: 6,
            message: 'bad email confirm code',
        };
    }
    return { success: true };
};

async function checkForgetPasswordUserParam(param, logInfoPurpose) {
    if (!common.checkNullOrEmptyString(param)) {
        return {
            success: false,
            code: 0,
            message: 'null or empty param',
        };
    }
    if (!checkPasswordStrength(param.password)) {
        return {
            success: false,
            code: 1,
            message: 'weak password',
        };
    }
    let countEmailResult = await countEmail(param.email, logInfoPurpose);
    if (!countEmailResult.success) {
        return {
            success: false,
            code: 2,
            message: 'could not count email',
        };
    }
    if (countEmailResult.count != 1) {
        return {
            success: false,
            code: 3,
            message: 'not a registered email',
        };
    }
    let checkEmailConfirmCodeResult =
        await countEmailConfirmCode(param.email, param.emailConfirm, logInfoPurpose);
    if (!checkEmailConfirmCodeResult.success) {
        return {
            success: false,
            code: 4,
            message: 'could not count email to confirm code',
        };
    }
    if (checkEmailConfirmCodeResult.count != 1) {
        return {
            success: false,
            code: 5,
            message: 'bad email confirm code',
        };
    }
    return { success: true };
};

function checkPasswordStrength(password) {
    let result = passwordStrength.passwordStrength(password);
    if (result.value == 'Weak' || result.value == 'Too weak') {
        return false;
    }
    return true;
};

async function countEmail(email, logInfoPurpose) {
    let sql = `SELECT COUNT(\`id\`) AS \`count\` FROM ${configDb.schemaCredential}.\`user\` WHERE \`email\` = ?`;
    let param = [email];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'count email',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return {
        success: true,
        count: result.sqlResults[0].count,
    };
};

async function saveEmailAndCode(code, paramPurpose, logInfoPurpose) {
    let sql = `REPLACE INTO ${configDb.schemaCredential}.\`email_confirm_code\` (\`email\`, \`code\`, \`expire\`) ` +
        `VALUES (?,?,DATE_ADD(NOW(), INTERVAL 10 MINUTE))`;
    let param = [paramPurpose.email, code];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'save email and code',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, };
};

function createEmailStandardConfirmCodeContent(code, language, key_title, key_content) {
    if (!['vi', 'en'].includes(language)) {
        language = 'vi';
    }
    let title = templateEmail[key_title][language].replace('<<<code>>>', code);
    let content = templateEmail[key_content][language].replace('<<<code>>>', code);
    return {
        title,
        content,
    };
};

async function countEmailConfirmCode(email, code, logInfoPurpose) {
    let sql = `SELECT COUNT(\`id\`) AS \`count\` FROM ${configDb.schemaCredential}.\`email_confirm_code\` ` +
        `WHERE \`email\` = ? AND \`code\` =? AND \`expire\` > NOW()`;
    let param = [email, code];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'check email confirm code',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, count: result.sqlResults[0].count, };
};

async function saveRegistrationData(paramPurpose, logInfoPurpose) {
    let sql = `INSERT INTO ${configDb.schemaCredential}.\`user\` ` +
        `(\`email\`, \`password\`, \`name_first\`, \`name_middle\`, \`name_last\`) VALUES ` +
        `(?,?,?,?,?)`;
    let param = [
        paramPurpose.email,
        paramPurpose.password,
        paramPurpose.nameFirst,
        paramPurpose.nameMiddle,
        paramPurpose.nameLast,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'save registration user data',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, };
};


async function deleteEmailConfirmCode(paramPurpose, logInfoPurpose) {
    let sql = `DELETE FROM ${configDb.schemaCredential}.\`email_confirm_code\` ` +
        `WHERE \`email\` = ?`;
    let param = [
        paramPurpose.email,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'delete email confirm code',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, };
};

async function checkForgetPasswordEmailCodeParam(param, logInfoPurpose) {
    if (!common.checkNullOrEmptyString(param)) {
        return {
            success: false,
            code: 0,
            message: 'null or empty param',
        };
    }
    let countEmailResult = await countEmail(param.email, logInfoPurpose);
    if (!countEmailResult.success) {
        return {
            success: false,
            code: 1,
            message: 'could not count email',
        };
    }
    if (countEmailResult.count != 1) {
        return {
            success: false,
            code: 2,
            message: 'not a registered email',
        };
    }
    return { success: true };
};

async function changeForgetPassword(paramPurpose, logInfoPurpose) {
    let sql = `UPDATE ${configDb.schemaCredential}.\`user\` SET ?? = ? WHERE ?? = ?`;
    let param = [
        'password',
        paramPurpose.password,
        'email',
        paramPurpose.email,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action: 'change forget password',
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false };
    }
    return { success: true, };
};

function checkLoginUserParam(param) {
    if (!common.checkNullOrEmptyString(param)) {
        return {
            success: false,
            code: 0,
            message: 'null or empty param',
        };
    }
    return { success: true };
};

async function getDataFromEmail(paramPurpose, logInfoPurpose, action) {
    let sql = `SELECT ??, ??, ??, ??, ?? FROM ${configDb.schemaCredential}.?? WHERE ?? = ?`;
    let param = [
        'id',
        'name_first',
        'name_middle',
        'name_last',
        'password',
        'user',
        'email',
        paramPurpose.email,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action,
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false, code: 0, message: 'database error', };
    }
    if (result.sqlResults[0] == null) {
        return { success: false, code: 1, message: 'no such user found', };
    }
    let id = result.sqlResults[0].id;
    let hash = result.sqlResults[0].password;
    let nameFirst = result.sqlResults[0].name_first;
    let nameMiddle = result.sqlResults[0].name_middle;
    let nameLast = result.sqlResults[0].name_last;
    return { success: true, id, nameFirst, nameMiddle, nameLast, hash, };
};

async function generateSerialTokenHash() {
    let desiredCharList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let serial = await cryptoCS.generateRandomString(32, desiredCharList);
    let token = await cryptoCS.generateRandomString(32, desiredCharList);
    let hashResult = await cryptoCS.hashTokenLogin(token);
    if (!hashResult.success) {
        return { success: false, message: `${hashResult.message}`, };
    }
    return { success: true, serial, token, hash: hashResult.hash, };
};

function createReponseCookie(serial, hash, response) {
    let string = `${serial}${configSystem.cookieSeparator}${hash}`;
    response.cookie('data', string, {
        maxAge: cookieMaxAge,
        httpOnly: true,
        secure: configSystem.cookieSecure,
        sameSite: configSystem.cookieSameSite,
    });
};

async function saveLoginToken(paramSave, logInfoPurpose, action) {
    let sql = `REPLACE INTO ${configDb.schemaCredential}.?? (??, ??, ??, ??, ??, ??) VALUES ` +
        `(?,?,?, DATE_ADD(NOW(), INTERVAL ${configSystem.cookieExpireInDay} DAY),?, ?)`;
    let param = [
        'token',
        'user', 'token', 'serial', 'expire', 'ip', 'ua',
        paramSave.id,
        paramSave.token,
        paramSave.serial,
        logInfoPurpose.ip,
        paramSave.userAgent,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action,
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false, code: 0, message: 'database error', };
    }
    return { success: true, };
};

async function deleteToken(serial, logInfoPurpose, action) {
    let sql = `DELETE FROM ${configDb.schemaCredential}.?? WHERE ?? = ?`;
    let param = [
        'token',
        'serial',
        serial,
    ];
    let logInfoAction = {
        idPurpose: logInfoPurpose.id,
        action,
        ip: logInfoPurpose.ip,
    };
    let result = await db.query(sql, param, logInfoAction);
    if (!result.success) {
        return { success: false, code: 0, message: 'database error', };
    }
    return { success: true, };
};