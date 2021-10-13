const common = require('./common.js');
const bcrypt = require('bcrypt');
const configCrypto = require('../config/configCrypto.js');
const crypto = require('crypto');

module.exports = {
    hashPasswordUser: function(password) {
        return new Promise(function(resolve) {
            bcrypt.hash(password, configCrypto.saltRoundHashPasswordUser)
                .then(function(hash) {
                    resolve({ success: true, hash, });
                })
                .catch(function(error) {
                    resolve({ success: false, message: `${error}`, });
                });
        });
    },

    hashTokenLogin: async function(token) {
        return await hashString(token, configCrypto.saltRoundHashTokenLogin);
    },

    compareStringAndHash: function(string, hash) {
        return new Promise(function(resolve) {
            bcrypt.compare(string, hash)
                .then(function(result) {
                    resolve({ success: true, result, });
                })
                .catch(function(error) {
                    resolve({ success: false, message: `${error}`, });
                });
        });
    },

    generateRandomString(length, desiredCharList) {
        return new Promise(function(resolve) {
            if (desiredCharList == null) {
                desiredCharList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            }
            let desiredCharListLength = desiredCharList.length;
            let result = '';
            crypto.randomBytes(length, function(error, buffer) {
                if (error) {
                    common.consoleLogActionError('Failed to use randomBytes. Use fallback method.');
                    for (let i = 0; i < length; i++) {
                        result = result + desiredCharList.charAt(Math.floor(Math.random() *
                            desiredCharListLength));
                    }
                    resolve(result);
                    return;
                }
                let array = buffer.toJSON().data;
                for (let i = 0; i < length; i++) {
                    let index = Math.floor(array[i] / 255 * (desiredCharListLength - 1));
                    result = result + desiredCharList[index];
                }
                resolve(result);
            });

        });
    },
};

function hashString(string, saltRound) {
    return new Promise(function(resolve) {
        bcrypt.hash(string, saltRound)
            .then(function(hash) {
                resolve({ success: true, hash, });
            })
            .catch(function(error) {
                resolve({ success: false, message: `${error}`, });
            });
    });
};