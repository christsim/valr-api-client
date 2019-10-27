var { signRequest } = require('../src/valr-v1-signer.js');
var expect = require('chai').expect;

describe('VALR API Signer', function () {

    this.bail(true);

    before(async function () {
    })

    it('can sign POST request', async function () {
        var options = {
            apiKeyId: '41b24fab0d6443929f5cb76782815ca0da32f3190e7383f9fe7752e755868141',
            apiKeySecret: '0e06e223696b1d9bc6d8df1f701a87326c16763d8f2ebaaacb1042b61d7c3035',
        };

        var expiresAt = 1552244930586;

        var verb = 'POST';
        var url = '/api/v1/withdraw';
        var body = {
            currency: 'eth',
            amount: '2.24353'
        };

        var signature = signRequest(options.apiKeySecret, expiresAt, verb, url, JSON.stringify(body));
        
        expect(signature).to.be.equal('0b89e7b4c8236255a7d1bf415dcb745b14ba2cf679ae38f42b3207c5c0a1c6a848f6ea5466cccb1e38f54689d86ab4ea73f9cd0d600b90c91ef619828eb7e2fb');
        // echo -n '1552244930586POST/api/v1/withdraw{"currency":"eth","amount":"2.24353"}' | openssl sha512 -hmac "0e06e223696b1d9bc6d8df1f701a87326c16763d8f2ebaaacb1042b61d7c3035" 
    });

    it('can sign GET request', async function () {
        var options = {
            apiKeyId: '41b24fab0d6443929f5cb76782815ca0da32f3190e7383f9fe7752e755868141',
            apiKeySecret: '0e06e223696b1d9bc6d8df1f701a87326c16763d8f2ebaaacb1042b61d7c3035',
        };

        var expiresAt = 1552244930586;

        var verb = 'GET';
        var url = '/api/v1/withdraw';

        var signature = signRequest(options.apiKeySecret, expiresAt, verb, url);
        
        expect(signature).to.be.equal('475048965cef521871f5c4a3d9d692c3e3279e27c7b9cdaca07c1f1bd2fb27d4fdb88ea86ef23290b585f03ce2e9af08b31387ca3c7dcdf7832dce7bcea7fdfc');
        // echo -n '1552244930586GET/api/v1/withdraw' | openssl sha512 -hmac "0e06e223696b1d9bc6d8df1f701a87326c16763d8f2ebaaacb1042b61d7c3035" 
    });

});