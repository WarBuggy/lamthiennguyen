class Common {
    static sendToBackend(webPart, dataJson) {
        let url = window.BACKEND_URL + webPart;
        Common.showWaiting();
        Common.encodeSendData(dataJson);
        return new Promise(function(resolve, reject) {
            let xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        Common.parseJSON(this['response'])
                            .then(function(parseResult) {
                                resolve({
                                    success: true,
                                    data: parseResult,
                                });
                                Common.hideWaiting();
                            })
                            .catch(function() {
                                Common.hideWaiting();
                                Common.showMessage('{{{error_api_general}}}', [899, ]);
                                resolve({ success: false, });
                            });
                    } else {
                        Common.hideWaiting();
                        resolve({ success: false, code: this.status, });
                    }
                }
            };
            xmlhttp.onerror = function(xmlhttpErr) {
                reject(xmlhttpErr);
            }
            let params = '';
            for (let key in dataJson) {
                if (dataJson.hasOwnProperty(key)) {
                    params = params + key + '=' + dataJson[key] + '&';
                }
            }
            params = params.slice(0, -1);
            xmlhttp.open('POST', url, true);
            xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xmlhttp.setRequestHeader('cache', 'no-cahce');
            xmlhttp.send(params);
        });
    };

    static parseJSON(input) {
        return new Promise(function(resolve, reject) {
            let jsonRes = JSON.parse(input);
            if (jsonRes.success) {
                resolve(jsonRes);
            } else {
                reject(jsonRes);
            }
        });
    };

    static showMessage(message, messageType) {
        if (typeof Message !== 'function') {
            alert(message);
            return;
        }
        Message.showMessage(message, messageType);
    };

    static validateEmail(input) {
        let re =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(input).toLowerCase());
    };

    static checkPasswordStrength(password) {
        let strongPasswordCriteria = new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})');
        return strongPasswordCriteria.test(password);
    };

    static showWaiting() {
        let divWaiting = document.createElement('div');
        divWaiting.classList.add('general-overlay');
        divWaiting.classList.add('waiting');
        document.body.appendChild(divWaiting);
    };

    static hideWaiting() {
        let divList = document.body.children;
        for (let i = divList.length - 1; i >= 0; i--) {
            let div = divList[i];
            if (div.classList.contains('waiting') || div.classList.contains('general-overlay')) {
                document.body.removeChild(div);
            }
        }
    };

    static encodeSendData(data) {
        if (data == null) {
            return {};
        }
        let keyList = Object.keys(data);
        for (let i = 0; i < keyList.length; i++) {
            let key = keyList[i];
            let value = data[key];
            data[key] = encodeURIComponent(value);
        }
    };

    static completeString(string, values) {
        if (values == null) {
            return string;
        }
        let result = string;
        if (values != null) {
            for (let i = 0; i < values.length; i++) {
                result = result.replace(`{${i}}`, values[i]);
            }
        }
        return result;
    };

    static saveToStorage(key, value) {
        if (typeof(Storage) === "undefined") {
            return;
        }
        localStorage.setItem(key, value);
    };

    static loadFromStorage(key) {
        if (typeof(Storage) === "undefined") {
            return null;
        }
        return localStorage.getItem(key);
    };

    static getURLParameter(sParam, locationSearch) {
        if (locationSearch == null) {
            locationSearch = document.location.search;
        }
        let sPageURL = locationSearch.substring(1);
        let sURLVariables = sPageURL.split('&');
        for (let i = 0; i < sURLVariables.length; i++) {
            let sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0].trim() == sParam) {
                return sParameterName[1].trim();
            }
        }
    };
};