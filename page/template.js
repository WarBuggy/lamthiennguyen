const configSystem = require('../config/configSystem.js');
const common = require('../common/common.js');
const fs = require('fs-extra');

module.exports = {
    createContentText: async function(app, path) {
        let template = null;
        if (configSystem.reloadHTML) {

        } else {
            template = app.get('data').template[key];
        }
        return template;
    },

    createHTMLHeader: async function(app, infoUser, htmlTemplate, pageContinue, encodeParamOfNextPage) {
        let htmlHeader = await module.exports.createContentText(app, 'header');
        let html = '';
        if (infoUser == null) {
            let objectParam = {
                pageContinue: pageContinue,
            };
            let paramPageString = createParamPageString(objectParam, encodeParamOfNextPage);
            let aRegister = common.createHTMLObject('general-button-link', 'a');
            aRegister.attr.href = `login.html${paramPageString}`;
            aRegister.innerText = common.getLabel('login');
            html = common.jsonToHTMLString(aRegister);
        } else {
            let objectParam = {
                pageContinue: pageContinue,
            };
            let paramPageString = createParamPageString(objectParam, encodeParamOfNextPage);

            let divOuter = common.createHTMLObject([], 'div');
            divOuter.style.display = 'grid';
            divOuter.style['grid-template-rows'] = '1fr auto';
            divOuter.style['grid-template-columns'] = '1fr';
            divOuter.style['justify-items'] = 'end';
            divOuter.style['height'] = '100%';

            let div = common.createHTMLObject([], 'div');
            div.innerText = `Chào ${infoUser.nameFirst}`;
            div.style['align-self'] = 'center';
            divOuter.children.push(div);

            let a = common.createHTMLObject('general-button-link', 'a');
            a.attr.href = `logout.html${paramPageString}`;
            a.innerText = common.getLabel('logout');
            divOuter.children.push(a);

            html = common.jsonToHTMLString(divOuter);
        }
        htmlHeader = htmlHeader.replace('|||info_user|||', html);
        htmlTemplate = htmlTemplate.replace('|||htmlHeader|||', htmlHeader);
        return htmlTemplate;
    },

    getParamPageObject: function(request) {
        if (request.query == null || request.query.paramPage == null) {
            return {};
        }
        let stringEncodeBase = request.query.paramPage.trim();
        let stringObject = common.decodeBase64(stringEncodeBase);
        try {
            let object = JSON.parse(stringObject);
            return object;
        } catch (error) {
            return {};
        }
    },

    createLinkBackForAccountPage: function(paramObject) {
        let link = paramObject.paramPage.pageContinue;
        if (link == null) {
            link = 'index.html';
        }
        if (paramObject.paramOfNextPage != '') {
            link = link + '?paramPage=' + paramObject.paramOfNextPage;
        }
        return link;
    },

    createStringParamForAccountPage: function(paramObject) {
        let link = paramObject.paramPage.pageContinue;
        if (link == null) {
            link = 'index.html';
        }
        let object = {
            pageContinue: link,
        };
        return createParamPageString(object, paramObject.paramOfNextPage);
    },
};

function createParamPageString(object, encodeParamOfNextPage) {
    let stringJSON = JSON.stringify(object);
    let stringEncodeBase64 = common.encodeBase64(stringJSON);
    let stringParam = `?paramPage=${encodeURIComponent(stringEncodeBase64)}`;
    if (encodeParamOfNextPage != null && encodeParamOfNextPage != '') {
        stringParam = stringParam + `&ponp=${encodeParamOfNextPage}`;
    }
    return stringParam;
};

function populateHeader(html) {
    let keyList = Object.keys(templateHeader);
    for (let i = 0; i < keyList.length; i++) {
        let key = keyList[i];
        let keyReplace = `|||${key}|||`
        html = html.replace(keyReplace, templateHeader[key]);
    }
    return html;
};

function processStringLabel(string) {
    string = string.replace(/{{{.*}}}/g, function(match) {
        let labelName = match.replace(/{{{/, '').replace(/}}}/, '');
        return common.getLabel(labelName);
    });
    return string;
};