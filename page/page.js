const configSystem = require('../config/configSystem.js');

const common = require('../common/common.js');

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
        let requestIp = common.getReadableIP(request);
        let purpose = 'html page index';
        common.consoleLogPurpose(`IP: ${requestIp}, purpose: ${purpose}, status: received.`);

        let html = getContent(app, ['html', 'index'], 'page/html/index.html');
        response.send(html);

        // let logInfoPurpose = db.createLogInfoPurpose(purpose, null, requestIp);
        // if (configSystem.skipDBLoading !== true) {
        //     let param = [];
        //     let logPurposeResult = await db.logPurpose(param, logInfoPurpose);
        //     if (!logPurposeResult.success) {
        //         response.status(logPurposeResult.code).json({ success: false, });
        //         return;
        //     };
        // }

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