const configSystem = require('./config/configSystem.js');

const common = require('./common/common.js');
const db = require('./common/db.js');
const processContent = require('./page/page.js').processContent;

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const useragent = require('express-useragent');
const http = require('http');
const app = express();

start();

async function start() {
    let connected = await prepareDbConnection();
    if (!connected) {
        return;
    }
    let data = loadFile();
    app.set('data', data);
    prepareHttpServer(data);
};

function loadFile() {
    let contentHTML = common.loadFile('./page/html');
    let commonHTML = common.loadFile('./page/html/common');
    let contentCSS = common.loadFile('./page/css');
    let contentScript = common.loadFile('./page/script');
    let listKey = Object.keys(contentHTML);
    for (let i = 0; i < listKey.length; i++) {
        let key = listKey[i];
        contentHTML[key] = processContent(contentHTML[key], commonHTML, contentCSS, contentScript);
    }
    return contentHTML;
};

async function prepareDbConnection() {
    common.consoleLog('Begin to establish database connection...');
    let dbConnection = await db.getConnection();
    if (dbConnection == null) {
        common.consoleLogError('Cannot establish database conneciton. Program is now terminated.');
        return false;
    }
    common.consoleLog('Established database connection.');
    return true;
};

function prepareHttpServer() {
    app.use(express.json());
    app.use(express.urlencoded({ limit: '10mb', extended: false, }));
    app.use(cors());
    app.use(cookieParser(configSystem.cookieSecret));
    app.use(useragent.express());
    app.use(express.static('public'));

    http.createServer(app).listen(configSystem.httpPort, function() {
        common.consoleLog('HTTP Server started on port ' + configSystem.httpPort + '.');
        require('./page/page.js')(app);
        require('./api/credential.js')(app);
    });
};