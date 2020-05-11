const signer = require('./valr-v1-signer.js');
const request = require('superagent')


class ValrV1RestClient {

    /**
     *
     * @param {*} apiKey - the api key
     * @param {*} apiSecret - the api secret
     * @param {*} baseUrl - the rest api base url
     */
    constructor(apiKey = null, apiSecret = null, baseUrl = null) {
        this.baseUrl = baseUrl || 'https://api.valr.com'
        this.apiKey = apiKey
        this.apiSecret = apiSecret

        this.SELL = 'SELL'
        this.BUY = 'BUY'

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
                getTransactionHistory: (skip = 0, limit = 100) => this.call('get', `/v1/account/transactionhistory?skip=${skip}&limit=${limit}`),
                getMyTradeHistory: (pair, limit) => this.call('get', `/v1/account/${pair}/tradehistory?limit=${limit}`)
            }

            this.wallet = {
                crypto: {
                    getCryptoDepositAddress: (currency) => this.call('get', `/v1/wallet/crypto/${currency}/deposit/address`),
                    getWithdrawalInfo: (currency) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw`),
                    createNewWithdrawal: (currency, address, amount, paymentReference = null) => this.call('post', `/v1/wallet/crypto/${currency}/withdraw`, { address, paymentReference, amount }),
                    getWithdrawalStatus: (currency, id) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw/${id}`),
                    getDepositHistory: (currency, skip = 0, limit = 100) => this.call('get', `/v1/wallet/crypto/${currency}/deposit/history?skip=${skip}&limit=${limit}`),
                    getWithdrawHistory: (currency, skip = 0, limit = 100) => this.call('get', `/v1/wallet/crypto/${currency}/withdraw/history?skip=${skip}&limit=${limit}`),
                },
                fiat: {
                    getBankAccounts: (currency) => this.call('get', `/v1/wallet/fiat/${currency}/accounts`),
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
                createLimitOrder: (pair, side, quantity, price, postOnly = false, customerOrderId = null) => this.call('post', '/v1/orders/limit', { customerOrderId, pair, side, quantity, price, postOnly }),
                createMarketBuyOrder: (pair, quoteAmount, customerOrderId = null) => this.call('post', '/v1/orders/market', { customerOrderId, pair, side: this.BUY, quoteAmount }),
                createMarketSellOrder: (pair, baseAmount, customerOrderId = null) => this.call('post', '/v1/orders/market', { customerOrderId, pair, side: this.SELL, baseAmount }),
                getAllOpenOrders: () => this.call('get', `/v1/orders/open`),
                getOrderHistory: () => this.call('get', `/v1/orders/history`),
                getOrderHistorySummaryForOrderId: (orderId) => this.call('get', `/v1/orders/history/summary/order/orderid/${orderId}`),
                getOrderHistorySummaryForCustomerOrderId: (customerOrderId) => this.call('get', `/v1/orders/history/summary/order/orderid/${customerOrderId}`),
                getOrderHistoryDetailsForOrderId: (orderId) => this.call('get', `/v1/orders/history/details/order/orderid/${orderId}`),
                getOrderHistoryDetailsForCustomerOrderId: (customerOrderId) => this.call('get', `/v1/orders/history/details/order/orderid/${orderId}`),
                cancelOrder: (pair, orderId = null, customerOrderId = null) => this.call('delete', `/v1/orders/order`, { pair, orderId, customerOrderId }),
                getOrderStatusForOrderId: (pair, orderId) => this.call('get', `/v1/orders/${pair}/orderid/${orderId}`),
                getOrderStatusForCustomerOrderId: (pair, customerOrderId) => this.call('get', `/v1/orders/${pair}/order/customerorderid/${customerOrderId}`)
            }
        }
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

        try {
            return (await request[verb](this.baseUrl + path)
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

        var timestamp = (new Date()).getTime();
        var signature = signer.signRequest(this.apiSecret, timestamp, verb, path, body);

        try {
            return (await request[verb](this.baseUrl + path)
                .set('X-VALR-API-KEY', this.apiKey)
                .set('X-VALR-SIGNATURE', signature)
                .set('X-VALR-TIMESTAMP', timestamp)
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
}

module.exports = ValrV1RestClient;
