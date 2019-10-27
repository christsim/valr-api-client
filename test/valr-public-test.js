const { ValrV1RestClient } = require('../index.js');
var expect = require('chai').expect;

describe('VALR Public API', function () {

    this.bail(true);

    before(async function () {
    })

    it('can call public route', async function () {
        const valrClient = new ValrV1RestClient()
        const summary = await valrClient.public.getMarketSummary('BTCZAR');
        
        expect(summary).to.be.ok;
        expect(summary).to.haveOwnProperty('baseVolume');
    });
});