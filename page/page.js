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
        let key = 'index';
        let purpose = `html page ${key}`;
        await common.handleRequestStageInit(purpose, request, response);

        let html = ContentPage(app, key).content;
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

    app.get('/register.html', async function(request, response) {
        let key = 'register';
        let purpose = `html page ${key}`;
        let dataFromRequest = await common.handleRequestStageInit(purpose, request, response);

        let html = new ContentPage(app, key).content;

        let stringParam = Account.createStringParam(dataFromRequest.param);
        html = html.replace(/\|\|\|stringParam\|\|\|/g, stringParam);
        // http://localhost:19546/register.html?param=eyJwYWdlTmV4dCI6ImluZGV4Lmh0bWwiLCJwYXJhbVBhZ2VOZXh0IjoiMTIzNDU2NyJ9

        response.send(html);
    });
};

module.exports.processContent = function(contentFile, commonHTML, css, script) {
    contentFile = ContentPage.processCommonHTML(contentFile, commonHTML);
    contentFile = ContentPage.processCSS(contentFile, css);
    contentFile = ContentPage.processScript(contentFile, script);
    if (configSystem.reloadContent !== true) {
        contentFile = ContentPage.removePathFile(contentFile);
    }
    return contentFile;
};

class ContentPage {
    constructor(app, key) {
        let data = app.get('data');
        if (configSystem.reloadContent !== true) {
            this.content = data[key];
            return;
        }
        let contentFile = data[key];
        let pathFile = this.getPathFile(contentFile);
        if (pathFile == null) {
            this.content = contentFile;
            return;
        }
        contentFile = fs.readFileSync(pathFile, { encoding: 'utf8', });
        contentFile = common.processStringLabel(contentFile);
        let commonHTML = common.loadFile('page/html/common');
        let css = common.loadFile('page/css');
        let script = common.loadFile('page/script');
        let contentFinal = module.exports.processContent(contentFile, commonHTML, css, script);
        contentFinal = ContentPage.removePathFile(contentFinal);
        this.content = contentFinal;
    };

    getPathFile(contentFile) {
        let founds = contentFile.match(/<!--PATH (?<path>.*) PATH-->/);
        if (founds == null) {
            return null;
        }
        return founds.groups.path;
    };

    static removePathFile(contentFile) {
        return contentFile.replace(/<!--PATH .* PATH-->/g, '');
    };

    static processCommonHTML(content, commonHTML) {
        content = content.replace('|||linkPreview|||', commonHTML.linkPreview)
            .replace('|||viewPortMeta|||', commonHTML.viewPortMeta)
            .replace('|||favicon|||', commonHTML.favicon);
        return content;
    };

    static processCSS(contentFile, css) {
        contentFile = contentFile.replace(/\|\|\|css\|\|\|.*\|\|\|css\|\|\|/g, function(match) {
            let listString = match.replace(/\|\|\|css\|\|\|/g, '');
            let list = listString.split(',');
            let stringCss = [];
            for (let i = 0; i < list.length; i++) {
                let key = list[i];
                if (css[key] != null) {
                    stringCss.push(css[key]);
                }
            }
            return `<style>${stringCss.join('')}</style>`;
        });
        return contentFile;
    };

    static processScript(contentFile, script) {
        contentFile = contentFile.replace(/\|\|\|script\|\|\|.*\|\|\|script\|\|\|/g, function(match) {
            let listString = match.replace(/\|\|\|script\|\|\|/g, '');
            let list = listString.split(',');
            let stringScript = [];
            for (let i = 0; i < list.length; i++) {
                let key = list[i];
                if (script[key] != null) {
                    stringScript.push(script[key]);
                }
            }
            return `<script>${stringScript.join('')}</script>`;
        });
        return contentFile;
    };
}

class Account {
    static createStringParam(param) {
        // let test = {
        //     pageNext: 'index.html',
        //     paramPageNext: '1234567',
        // };
        // console.log(common.encodeBase64(JSON.stringify(test)));

        let result = {};
        if (param == null || param.pageNext == null) {
            return '';
        }
        result.pageNext = param.pageNext;
        if (param.paramPageNext != null) {
            result.paramPageNext = param.paramPageNext;
        }
        let string = `?param=${common.encodeBase64(JSON.stringify(result))}`;
        return string;
    };
};