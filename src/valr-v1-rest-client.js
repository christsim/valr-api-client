const signer = require('./valr-v1-signer.js');
const request = require('superagent')
const Agent = require('agentkeepalive').HttpsAgent;

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
     */
    constructor({ apiKey = null,
        apiSecret = null,
        subAccountPublicId = null,
        baseUrl = null
    } = {}) {
        this.baseUrl = baseUrl || 'https://api.valr.com';
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.subAccountPublicId = subAccountPublicId ? subAccountPublicId : '';

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

            this.apiKeys = {
                getInfo: () => this.call('get', '/v1/account/api-keys/current'),
            }

            this.account = {
                getBalances: (excludeZeroBalances = true) => this.call('get', `/v1/account/balances?excludeZeroBalances=${excludeZeroBalances}`),
                getAllBalances: () => this.call('get', '/v1/account/balances/all?excludeZeroBalances=true'),
                getTransactionHistory: (skip = 0, limit = 100) => this.call('get', `/v1/account/transactionhistory?skip=${skip}&limit=${limit}`),
                getMyTradeHistory: (pair, limit = 100) => this.call('get', `/v1/account/${pair}/tradehistory?limit=${limit}`),
                getSubAccounts: () => this.call('get', '/v1/account/subaccounts'),
                registerSubAccount: (label) => this.call('post', '/v1/account/subaccount', { label }),
                internalTransfer: (toAccountPublicId, currencyCode, amount, fromAccountPublicId = '0') => this.call('post', '/v1/account/subaccounts/transfer', { fromAccountPublicId, toAccountPublicId, currencyCode, amount })
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
                    createBankAccount: (currency, bank, accountHolder, accountNumber, branchCode, accountType) => this.call('post', `/v1/wallet/fiat/${currency}/accounts`, { bank, accountHolder, accountNumber, branchCode, accountType }),
                    createNewWithdrawal: (currency, linkedBankAccountId, amount, fast = false) => this.call('post', `/v1/wallet/fiat/${currency}/withdraw`, { linkedBankAccountId, amount, fast })
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

            this.loans = {
                getRates: () => this.call('get', `/v1/loans/rates`),
                getOpenLoans: () => this.call('get', `/v1/loans/open`),
                getLoanHistory: (currencySymbol) => this.call('get', `/v1/loans/credit-history?currencySymbol=${currencySymbol}`),
                getLoanUpdateHistory: (currencySymbol) => this.call('get', `/v1/loans/update-history?currencySymbol=${currencySymbol}`),
                createNewLoan: (currencySymbol, hourlyRate, amount) => this.call('post', `/v1/loans`, { currencySymbol, hourlyRate, amount }),
                increaseLoanAmount: (currencySymbol, increaseLoanAmountBy, loanId) => this.call('put', `/v1/loans/increase`, { currencySymbol, increaseLoanAmountBy, loanId }),
                changeRate: (currencySymbol, hourlyRate, loanId) => this.call('put', `/v1/loans/rate`, { currencySymbol, hourlyRate, loanId }),
                requestUnlock: (currencySymbol, unlockAmount, loanId) => this.call('put', `/v1/loans/unlock`, { currencySymbol, unlockAmount, loanId }),
                cancelUnlockRequest: (currencySymbol, loanId) => this.call('delete', `/v1/loans/unlock`, { currencySymbol, loanId }),
            }

            this.staking = {
                getRates: () => this.call('get', `/v1/staking/rates`),
                getRatesForCurrency: (currencySymbol) => this.call('get', `/v1/staking/rates/${currencySymbol}`),
                getStakingBalance: (currencySymbol) => this.call('get', `/v1/staking/balances/${currencySymbol}`),
                getStakingRewards: (currencySymbol, skip = 0, limit = 100) => this.call('get', `/v1/staking/rewards?${currencySymbol}&skip=${skip}&limit=${limit}`),
                getStakingHistory: (currencySymbol, skip = 0, limit = 100) => this.call('get', `/v1/staking/history?${currencySymbol}&skip=${skip}&limit=${limit}`),
                stake: (currencySymbol, amount) => this.call('post', `/v1/staking/stake`, { currencySymbol, amount }),
                unstake: (currencySymbol) => this.call('post', `/v1/staking/un-stake`, { currencySymbol, amount }),
            }

            this.exchange = {
                createLimitOrder: (pair, side, quantity, price, timeInForce = this.GOOD_TILL_CANCELLED, postOnly = false, customerOrderId = null) => this.call('post', '/v1/orders/limit', { customerOrderId, pair, side, quantity, price, postOnly }),
                createStopLimitOrder: (pair, side, type, quantity, price, stopPrice, timeInForce = this.GOOD_TILL_CANCELLED, customerOrderId = null) => this.call('post', '/v1/orders/stoplimit', { pair, side, type, quantity, price, stopPrice, timeInForce, customerOrderId }),
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
                getOrderStatusForCustomerOrderId: (pair, customerOrderId) => this.call('get', `/v1/orders/${pair}/customerorderid/${customerOrderId}`),

                createBatchOrders: (customerBatchId, requests) => this.call('post', '/v1/batch/orders', { customerBatchId, requests }),
                batchCreateLimitOrder: (pair, side, quantity, price, timeInForce = this.GOOD_TILL_CANCELLED, postOnly = false, customerOrderId = null) => ({ type: this.BATCH_PLACE_LIMIT, data: { customerOrderId, pair, side, quantity, price, postOnly } }),
                batchCreateStopLimitOrder: (pair, side, type, quantity, price, stopPrice, timeInForce = this.GOOD_TILL_CANCELLED, customerOrderId = null) => ({ type: this.BATCH_PLACE_STOP_LIMIT, data: { pair, side, type, quantity, price, stopPrice, timeInForce, customerOrderId } }),
                batchCreateMarketBuyOrder: (pair, quoteAmount, customerOrderId = null) => ({ type: this.BATCH_PLACE_MARKET, data: { customerOrderId, pair, side: this.BUY, quoteAmount } }),
                batchCreateMarketSellOrder: (pair, baseAmount, customerOrderId = null) => ({ type: this.BATCH_PLACE_MARKET, data: { customerOrderId, pair, side: this.SELL, baseAmount } }),
                batchCancelOrder: (pair, orderId = null, customerOrderId = null) => ({ type: this.BATCH_CANCEL_ORDER, data: { pair, orderId, customerOrderId } }),
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
                .agent(keepaliveAgent)
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

        try {
            return (await request[verb](this.baseUrl + path)
                .agent(keepaliveAgent)
                .set('X-VALR-API-KEY', this.apiKey)
                .set('X-VALR-SIGNATURE', signature)
                .set('X-VALR-TIMESTAMP', timestamp)
                .set('X-VALR-SUB-ACCOUNT-ID', this.subAccountPublicId)
                .set('Accept', 'application/json')
                .set('Content-type', 'application/json')
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
