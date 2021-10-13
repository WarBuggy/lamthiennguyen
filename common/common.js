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
            time = this.getCurrentTime();
        }
        console.log(consoleColor + '%s\x1b[0m', time + ': ' + string);
    },

    consoleLogError: function(string, consoleColor, time) {
        if (consoleColor == null) {
            consoleColor = configSystem.consoleColorError;
        }
        if (time == null) {
            time = this.getCurrentTime();
        }
        console.log(consoleColor + '%s\x1b[0m', time + ': ' + string);
    },

    consoleLogPurpose: function(string, time) {
        if (time == null) {
            time = this.getCurrentTime();
        }
        this.consoleLog(string, configSystem.consoleColorPurpose, time);
    },

    consoleLogPurposeError: function(string, time) {
        if (time == null) {
            time = this.getCurrentTime();
        }
        this.consoleLog(string, configSystem.consoleColorPurpose, time);
    },

    consoleLogAction: function(string, time) {
        if (time == null) {
            time = this.getCurrentTime();
        }
        this.consoleLog(string, configSystem.consoleColorAction, time);
    },

    consoleLogActionError: function(string, time) {
        if (time == null) {
            time = this.getCurrentTime();
        }
        this.consoleLog(string, configSystem.consoleColorAction, time);
    },

    consoleLogDBError: function(string, time) {
        if (time == null) {
            time = this.getCurrentTime();
        }
        this.consoleLog(string, configSystem.consoleColorDB, time);
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
            let part = file.split('.');
            let filePath = path + '/' + file;
            let contentFile = fs.readFileSync(filePath, { encoding: 'utf8', });
            contentFile = module.exports.processContentFile(contentFile);
            contentObject[part[0]] = contentFile;
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

    processContentFile: function(contentFile) {
        contentFile = module.exports.processStringLabel(contentFile);
        return contentFile;
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
};