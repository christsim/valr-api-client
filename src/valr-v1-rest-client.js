const signer = require('./valr-v1-signer.js');
const request = require('superagent');
require('superagent-proxy')(request);
const Agent = require('agentkeepalive').HttpsAgent;

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const keepaliveAgent = new Agent({
    maxSockets: 20,
    maxFreeSockets: 5,
    timeout: 60000,
    freeSocketTimeout: 30000 // free socket keepalive for 30 seconds
});

class ValrV1RestClient {

    /**
     *
     * @param {*} apiKey - the api key
     * @param {*} apiSecret - the api secret
     * @param {*} subAccountPublicId - the sub account public id
     * @param {*} baseUrl - the rest api base url
     * @param {*} proxyUrl - the proxy url
     * @param {*} proxyCert - the proxy cert
     */
    constructor({   apiKey = null,
                    apiSecret = null,
                    subAccountPublicId = null,
                    baseUrl = null,
                    proxyUrl = null,
                    proxyCert = null
    }) {
        this.baseUrl = baseUrl || 'https://api.valr.com';
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.subAccountPublicId = subAccountPublicId ? subAccountPublicId : '';
        this.proxyUrl = proxyUrl;
        this.proxyCert = proxyCert;

        this.SELL = 'SELL';
        this.BUY = 'BUY';

        // stop limit types
        this.STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT';
        this.TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT';

        // time in force
        this.GOOD_TILL_CANCELLED = 'GTC';
        this.FILL_OR_KILL = 'FOK';
        this.IMMEDIATE_OR_CANCEL = 'IOC';

        // batch order types
        this.BATCH_PLACE_LIMIT = 'PLACE_LIMIT';
        this.BATCH_PLACE_STOP_LIMIT = 'PLACE_STOP_LIMIT';
        this.BATCH_PLACE_MARKET = 'PLACE_MARKET';
        this.BATCH_CANCEL_ORDER = 'CANCEL_ORDER';

        if (!apiKey || !apiSecret) {
            this.public = {
                getTime: () => this.callPublic('get', '/v1/public/time'),
                getMarketSummaries: () => this.callPublic('get', '/v1/public/marketsummary'),
                getMarketSummary: (pair) => this.callPublic('get', `/v1/public/${pair}/marketsummary`),
                getPairs: () => this.callPublic('get', '/v1/public/pairs'),
                getCurrencies: () => this.callPublic('get', '/v1/public/currencies'),
                getOrderTypesList: () => this.callPublic('get', '/v1/public/ordertypes'),
                getOrderTypes: (pair) => this.callPublic('get', `/v1/public/${pair}/ordertypes`),
                getOrderBook: (pair) => this.callPublic('get', `/v1/public/${pair}/orderbook`)
            }
        } else {
            this.public = {
                getTime: () => this.call('get', '/v1/public/time'),
                getMarketSummaries: () => this.call('get', '/v1/public/marketsummary'),
                getMarketSummary: (pair) => this.call('get', `/v1/public/${pair}/marketsummary`),
                getPairs: () => this.call('get', '/v1/public/pairs'),
                getCurrencies: () => this.call('get', '/v1/public/currencies'),
                getOrderTypesList: () => this.call('get', '/v1/public/ordertypes'),
                getOrderTypes: (pair) => this.call('get', `/v1/public/${pair}/ordertypes`),
                getOrderBook: (pair) => this.call('get', `/v1/public/${pair}/orderbook`)
            }

            this.account = {
                getBalances: () => this.call('get', '/v1/account/balances'),
                getAllBalances: () => this.call('get', '/v1/account/balances/all'),
                getTransactionHistory: (skip = 0, limit = 100) => this.call('get', `/v1/account/transactionhistory?skip=${skip}&limit=${limit}`),
                getMyTradeHistory: (pair, limit = 100) => this.call('get', `/v1/account/${pair}/tradehistory?limit=${limit}`),
                getSubAccounts: () => this.call('get', '/v1/account/subaccounts'),
                registerSubAccount: (label) => this.call('post', '/v1/account/subaccount', { label }),
                internalTransfer: (toAccountPublicId, currencyCode, amount, fromAccountPublicId = '0') => this.call('post', '/v1/account/subaccount/transfer', { fromAccountPublicId, toAccountPublicId, currencyCode, amount })
            }

            this.wallet = {
                crypto: {
                    getAddressBook: (currency = null) => this.call('get', `/v1/wallet/crypto/address-book${currency ? '/' + currency : ''}`),
                    getCryptoDepositAddress: (currency) => this.call('get', `/v1/wallet/crypto/${currency}/deposit/address`),
                    getWithdrawalInfo: (currency) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw`),
                    createNewWithdrawal: (currency, address, amount, paymentReference = null) => this.call('post', `/v1/wallet/crypto/${currency}/withdraw`, { address, paymentReference, amount }),
                    createNewWithdrawalFromAddressBook: (currency, addressBookId, amount = null) => this.call('post', `/v1/wallet/crypto/${currency}/withdraw`, { addressBookId, amount }),
                    getWithdrawalStatus: (currency, id) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw/${id}`),
                    getDepositHistory: (currency, skip = 0, limit = 100) => this.call('get', `/v1/wallet/crypto/${currency}/deposit/history?skip=${skip}&limit=${limit}`),
                    getWithdrawHistory: (currency, skip = 0, limit = 100) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw/history?skip=${skip}&limit=${limit}`),
                },
                fiat: {
                    getBankAccounts: (currency) => this.call('get', `/v1/wallet/fiat/${currency}/accounts`),
                    createBankAccount: (currency, bank, accountHolder,accountNumber,branchCode,accountType) => this.call('post', `/v1/wallet/fiat/${currency}/accounts`, {bank, accountHolder,accountNumber,branchCode,accountType}),
                    createNewWithdrawal: (currency, linkedBankAccountId, amount) => this.call('post', `/v1/wallet/fiat/${currency}/withdraw`, { linkedBankAccountId, amount })
                }
            }

            this.marketData = {
                getOrderBook: (pair) => this.call('get', `/v1/marketdata/${pair}/orderbook`),
                getMyTradeHistory: (pair, limit) => this.call('get', `/v1/marketdata/${pair}/tradehistory?limit=${limit}`)
            }

            this.simple = {
                getQuote: (pair, payInCurrency, payAmount, side) => this.call('post', `/v1/simple/${pair}/quote`, { payInCurrency, payAmount, side }),
                createSimpleOrder: (pair, payInCurrency, payAmount, side) => this.call('post', `/v1/simple/${pair}/order`, { payInCurrency, payAmount, side }),
                getOrderStatus: (pair, id) => this.call('get', `/v1/simple/${pair}/order/${id}`),
            }

            this.exchange = {
                createLimitOrder: (pair, side, quantity, price, timeInForce = this.GOOD_TILL_CANCELLED, postOnly = false, customerOrderId = null) => this.call('post', '/v1/orders/limit', { customerOrderId, pair, side, quantity, price, postOnly }),
                createStopLimitOrder: (pair, side, type, quantity, price, stopPrice, timeInForce = this.GOOD_TILL_CANCELLED, customerOrderId = null) => this.call('post', '/v1/orders/stoplimit', {pair, side, type, quantity, price, stopPrice, timeInForce, customerOrderId}),
                createMarketBuyOrder: (pair, quoteAmount, customerOrderId = null) => this.call('post', '/v1/orders/market', { customerOrderId, pair, side: this.BUY, quoteAmount }),
                createMarketSellOrder: (pair, baseAmount, customerOrderId = null) => this.call('post', '/v1/orders/market', { customerOrderId, pair, side: this.SELL, baseAmount }),
                getAllOpenOrders: () => this.call('get', `/v1/orders/open`),
                getOrderHistory: () => this.call('get', `/v1/orders/history`),
                getOrderHistorySummaryForOrderId: (orderId) => this.call('get', `/v1/orders/history/summary/orderid/${orderId}`),
                getOrderHistorySummaryForCustomerOrderId: (customerOrderId) => this.call('get', `/v1/orders/history/summary/customerorderid/${customerOrderId}`),
                getOrderHistoryDetailForOrderId: (orderId) => this.call('get', `/v1/orders/history/detail/orderid/${orderId}`),
                getOrderHistoryDetailForCustomerOrderId: (customerOrderId) => this.call('get', `/v1/orders/history/detail/customerorderid/${customerOrderId}`),
                cancelOrder: (pair, orderId = null, customerOrderId = null) => this.call('delete', `/v1/orders/order`, { pair, orderId, customerOrderId }),
                cancelAllOrders: (pair) => this.call('delete', '/v1/orders', { pair }),
                getOrderStatusForOrderId: (pair, orderId) => this.call('get', `/v1/orders/${pair}/orderid/${orderId}`),
                getOrderStatusForCustomerOrderId: (pair, customerOrderId) => this.call('get', `/v1/orders/${pair}/order/customerorderid/${customerOrderId}`),

                createBatchOrders: (customerBatchId, requests) => this.call('post', '/v1/batch/orders', {customerBatchId, requests}),
                batchCreateLimitOrder: (pair, side, quantity, price, timeInForce = this.GOOD_TILL_CANCELLED, postOnly = false, customerOrderId = null) => ({ type: this.BATCH_PLACE_LIMIT, data: {customerOrderId, pair, side, quantity, price, postOnly }}),
                batchCreateStopLimitOrder: (pair, side, type, quantity, price, stopPrice, timeInForce = this.GOOD_TILL_CANCELLED, customerOrderId = null) => ({ type: this.BATCH_PLACE_STOP_LIMIT, data: { pair, side, type, quantity, price, stopPrice, timeInForce, customerOrderId}}),
                batchCreateMarketBuyOrder: (pair, quoteAmount, customerOrderId = null) => ({ type: this.BATCH_PLACE_MARKET, data:{ customerOrderId, pair, side: this.BUY, quoteAmount }}),
                batchCreateMarketSellOrder: (pair, baseAmount, customerOrderId = null) => ({ type: this.BATCH_PLACE_MARKET, data:{ customerOrderId, pair, side: this.SELL, baseAmount }}),
                batchCancelOrder: (pair, orderId = null, customerOrderId = null) => ({ type: this.BATCH_CANCEL_ORDER, data:{ pair, orderId, customerOrderId }}),
            }

            this.portfolio = {
                getSummary: () => this.call('get', `/v1/portfolio/summary`),
                getTotal: (today = this.getISOToday(), yesterday = this.getISOYesterday) => this.call('get', `/v1/portfolio/total?startDate=${today}&endDate=${yesterday}`),
                getTotalInCurrency: (refCurrency) => this.call('get', `/v1/portfolio/${refCurrency}/total`),
            }

            this.wire = {
                accounts: {
                    getWireAccounts: (skip = 0, limit = 10) => this.call('get', `/v1/wire/accounts?skip=${skip}&limit=${limit}`),
                    deleteWireAccount: (id) => this.call('delete', `/v1/wire/accounts/${id}`),
                    getDepositInstructions: (id) => this.call('get', `/wire/accounts/${id}/instructions`),

                    addIBANWireAccount: (accountType,  accountNumber,  accountHolderName, accountHolderCity,
                                         accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2 = "",
                                         accountHolderDistrict = "",  accountHolderPostalCode,  bankName = "",
                                         bankCity,  bankCountry,  bankAddressLine1 = "",
                                         bankAddressLine2 = "",  bankDistrict = ""
                    ) =>  this.call('post', '/v1/wire/accounts',
                        { accountType,  accountNumber,  accountHolderName, accountHolderCity,
                            accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2,
                            accountHolderDistrict,  accountHolderPostalCode,  bankName,
                            bankCity,  bankCountry,  bankAddressLine1,
                            bankAddressLine2,  bankDistrict}),

                    addSWIFTWireAccount: (accountType,  accountNumber, routingNumber,  accountHolderName, accountHolderCity,
                                          accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2 = "",
                                          accountHolderDistrict = "",  accountHolderPostalCode,  bankName,
                                          bankCity,  bankCountry,  bankAddressLine1 = "",
                                          bankAddressLine2 = "",  bankDistrict = ""
                    ) =>  this.call('post', '/v1/wire/accounts',
                        {accountType,  accountNumber, routingNumber,  accountHolderName, accountHolderCity,
                            accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2,
                            accountHolderDistrict,  accountHolderPostalCode,  bankName,
                            bankCity,  bankCountry,  bankAddressLine1,
                            bankAddressLine2,  bankDistrict}),

                    addUSWireAccount: ( accountType,  accountNumber,  accountHolderName, accountHolderCity,
                                        accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2 = "",
                                        accountHolderDistrict = "",  accountHolderPostalCode,  bankName = "",
                                        bankCity = "",  bankCountry,  bankAddressLine1 = "",
                                        bankAddressLine2 = "",  bankDistrict = ""
                    ) =>  this.call('post', '/v1/wire/accounts',
                        {accountType,  accountNumber,  accountHolderName, accountHolderCity,
                            accountHolderCountry,  accountHolderAddressLine1,  accountHolderAddressLine2,
                            accountHolderDistrict,  accountHolderPostalCode,  bankName,
                            bankCity,  bankCountry,  bankAddressLine1,
                            bankAddressLine2,  bankDistrict}),

                    //authoriseWireBankAccount: (resourceIdentifier) => this.call('put', '/v1/wire/accounts/authorise', {resourceIdentifier}),
                },

                withdrawals: {
                    createWithdrawal: (wireBankAccountId, amount) => this.call("post", '/v1/wire/withdrawals', {wireBankAccountId, amount}),
                    //authoriseWithdrawal: (resourceIdentifier) => this.call("put", "/v1/wire/withdrawals/authorise", {resourceIdentifier})
                },

            }

            this.pay = {
                getPayLimitDetails: () => this.call('get', '/v1/pay/limits'),
                getPayID: () => this.call('get', '/v1/pay/reference'),
                getSentPaymentsList: () => this.call('get', `/v1/pay/sent`),
                getPaymentByIdentifier: (identifier) => this.call('get', `/v1/pay/identifier/${identifier}`),
                getPaymentByTransactionID: (transactionid) => this.call('get', `/v1/pay/transactionid/${transactionid}`),
                makePayment: (currency = "ZAR", amount, recipientPayId = "", recipientEmail = "", recipientCell = "", recipientNote = "", senderNote = "", anonymous = false) => this.call('post', '/v1/pay',{ currency, amount, recipientPayId, recipientEmail, recipientCell, recipientNote, senderNote, anonymous}),
            }

        }
    }

    /**
     * Date helper
     */
    getISOToday() {
        return new Date().toISOString().split('T')[0];
    }

    getISOYesterday(){
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1)
        return yesterday.toISOString().split('T')[0];
    }

    /**
     *
     * call with no authentication
     *
     */
    async callPublic(verb, path, body = '') {
        if (typeof body != 'string') {
            body = JSON.stringify(body)
        }
        console.log(this.baseUrl + path)
        try {
            return (await request[verb](this.baseUrl + path)
                .agent(keepaliveAgent)
                .proxy(this.proxyUrl)
                .ca(this.proxyCert)
                .set('Accept', 'application/json')
                .send(body))
                .body
        } catch (err) {
            if (err.response) {
                throw new Error(`Error when calling: ${verb}:${path} - Status: ${err.response.status} - ${JSON.stringify(err.response.body)}`)
            } else {
                throw err
            }
        }
    }

    /**
     *
     * call with authentication
     *
     */
    async call(verb, path, body = '') {
        if (typeof body != 'string') {
            body = JSON.stringify(body)
        }

        const timestamp = (new Date()).getTime();
        const signature = signer.signRequest(this.apiSecret, timestamp, verb, path, body, this.subAccountPublicId);
        console.log(this.baseUrl + path);

        try {
            return (await request[verb](this.baseUrl + path)
                .agent(keepaliveAgent)
                .proxy(this.proxyUrl)
                .ca(this.proxyCert)
                .set('X-VALR-API-KEY', this.apiKey)
                .set('X-VALR-SIGNATURE', signature)
                .set('X-VALR-TIMESTAMP', timestamp)
                .set('X-VALR-SUB-ACCOUNT-ID', this.subAccountPublicId)
                .set('Accept', 'application/json')
                .send(body))
                .body
        } catch (err) {
            if (err.response) {
                console.error(`Error when calling: ${verb}:${path} - Status: ${err.response.status} - ${JSON.stringify(err.response.body)}`)
            } else {
                throw err
            }
        }
    }
}

module.exports = ValrV1RestClient;
