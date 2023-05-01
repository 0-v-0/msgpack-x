import { encode } from '../dist/index.js';
import msgpackJs from 'msgpack-js';
import msgpackLite from 'msgpack-lite';
import ymsgpack from '@ygoe/msgpack';
import msgpack from '@msgpack/msgpack';
import { tiny, small, medium, large } from './data.js';
import Benchtable from 'benchtable';

const suite = new Benchtable;

suite
	.addFunction('msgpack-x', x => { encode(x); })
	.addFunction('msgpack-js', x => { msgpackJs.encode(x); })
	.addFunction('msgpack-lite', x => { msgpackLite.encode(x); })
	.addFunction('@ygoe/msgpack', x => { ymsgpack.encode(x); })
	.addFunction('@msgpack/msgpack', x => { msgpack.encode(x); })
	// Note: JSON encodes buffers as arrays
	.addFunction('JSON.stringify (to Buffer)', x => { Buffer.from(JSON.stringify(x)); })

	.addInput('tiny', [tiny])
	.addInput('small', [small])
	.addInput('medium', [medium])
	.addInput('large', [large])

	.on('complete', function () {
		console.log(this.table.toString());
	})
	.run({ async: true });
