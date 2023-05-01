const
	array = (length) => Array(length).fill(0),
	str = (s) => Uint8Array.from(s, c => c.charCodeAt()),
	tiny = {
		foo: 1,
		bar: 'abc'
	};

const small = {
	foo: 1,
	bar: [1, 2, 3, 4, 'abc', 'def'],
	foobar: {
		foo: true,
		bar: -2147483649,
		foobar: {
			foo: Uint8Array.of(1, 2, 3, 4, 5),
			bar: 1.5,
			foobar: [true, false, 'abcdefghijkmonpqrstuvwxyz']
		}
	}
};

const medium = {
	unsigned: [1, 2, 3, 4, { b: { c: [128, 256, 65536, 4294967296] } }],
	signed: [-1, -2, -3, -4, { b: { c: [-33, -129, -32769, -2147483649] } }],
	str: ['abc', 'g'.repeat(32), 'h'.repeat(256)],
	array: [[], array(16)],
	map: {},
	nil: null,
	bool: { 'true': true, 'false': false, both: [true, false, false, false, true] },
	'undefined': [undefined, true, false, null, undefined]
};
for (let i = 32; i--;) {
	medium.map['a'.repeat(i)] = 'a'.repeat(i);
	medium.map['b'.repeat(i)] = str('b'.repeat(i));
}

const large = {
	unsigned: [1, 2, 3, 4, { b: { c: [128, 256, 65536, 4294967296] } }],
	signed: [-1, -2, -3, -4, { b: { c: [-33, -129, -32769, -2147483649] } }],
	bin: [str('abc'), str('a'.repeat(256)), str('a'.repeat(65535))],
	str: ['abc', 'g'.repeat(32), 'h'.repeat(256), 'g'.repeat(65535)],
	array: [[], array(16), array(256)],
	map: {},
	nil: null,
	bool: { 'true': true, 'false': false, both: [true, false, false, false, true] },
	'undefined': [undefined, true, false, null, undefined]
};
for (let i = 1024; i--;) {
	large.map['a'.repeat(i)] = 'a'.repeat(i);
	large.map['b'.repeat(i)] = str('b'.repeat(i));
}

export { tiny, small, medium, large };
