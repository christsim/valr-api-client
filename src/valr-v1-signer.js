'use strict';
const crypto = require('crypto');

/**
 * Signs the request payload using the api key secret
 * @param {*} apiKeySecret - the api key secret
 * @param {*} timestamp - the unix timestamp of this request e.g. (new Date()).getTime()
 * @param {*} verb - Http verb - GET, POST, PUT or DELETE
 * @param {*} path - path excluding host name, e.g. '/api/v1/withdraw
 * @param {*} body - http request body as a string, optional
 */
function signRequest(apiKeySecret, timestamp, verb, path, body = '') {
    return crypto.createHmac('sha512', apiKeySecret)
        .update(timestamp.toString())
        .update(verb.toUpperCase())
        .update(path)
        .update(body)
        .digest('hex');
}

/**
 * 
 * @param {*} apiKeySecret - the api key secret
 * @param {*} signature - the signature to verify against
 * @param {*} timestamp - the unix timestamp when of this request
 * @param {*} verb - Http verb - GET, POST, PUT or DELETE
 * @param {*} path - path excluding host name, e.g. '/api/v1/withdraw
 * @param {*} body - http request body as a string, optional
 */
function verifySignature(apiKeySecret, signature, timestamp, verb, path, body = '') {
    var calculatedSignature = signRequest(apiKeySecret, timestamp, verb, path, body);
    return calculatedSignature == signature;
}

module.exports = {
    signRequest,
    verifySignature
}