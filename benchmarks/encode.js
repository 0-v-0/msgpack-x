const notepack = require('../');
const msgpackJs = require('msgpack-js');
const msgpackLite = require('msgpack-lite');
const ymsgpack = require('@ygoe/msgpack');
const msgpack = require('@msgpack/msgpack');
const data = require('./data');

const Benchtable = require('benchtable');

const suite = new Benchtable;

suite
	.addFunction('msgpack-x', x => { notepack.encode(x); })
	.addFunction('msgpack-js', x => { msgpackJs.encode(x); })
	.addFunction('msgpack-lite', x => { msgpackLite.encode(x); })
	.addFunction('@ygoe/msgpack', x => { ymsgpack.encode(x); })
	.addFunction('@msgpack/msgpack', x => { msgpack.encode(x); })
	// Note: JSON encodes buffers as arrays
	.addFunction('JSON.stringify (to Buffer)', x => { Buffer.from(JSON.stringify(x)); })

	.addInput('tiny', [data.tiny])
	.addInput('small', [data.small])
	.addInput('medium', [data.medium])
	.addInput('large', [data.large])

	.on('complete', function () {
		console.log(this.table.toString());
	})
	.run({ async: true });
