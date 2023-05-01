import { encode, decode } from '../dist/index.js'
import { expect } from 'chai'
import fixture from './10000.json' assert { type: 'json' }

const array = (length) => Array(length).fill(0)
const str = (s) => Uint8Array.from(s, c => c.charCodeAt())
const map = (length) => {
	const result = {}
	for (let i = 0; i < length; i++)
		result[i + ''] = 0
	return result
}
const checkDecode = (value, hex) =>
	expect(decode(Buffer.from(hex, 'hex'))).to.deep.equal(value, 'decode failed')

const checkEncode = (value, hex) =>
	expect(Buffer.from(encode(value)).toString('hex')).to.equal(hex, 'encode failed')

const check = (value, hex) => {
	checkEncode(value, hex)
	checkDecode(value, hex)

	// And full circle for fun
	expect(decode(encode(value))).to.deep.equal(value)
}

describe('msgpack', function () {
	this.timeout(10000)

	it('positive fixint', () => {
		check(0x00, '00')
		check(0x44, '44')
		check(0x7f, '7f')
	})

	it('negative fixint', () => {
		check(-0x01, 'ff')
		check(-0x10, 'f0')
		check(-0x20, 'e0')
	})

	it('fixmap', () => {
		check({}, '80')
		check({ a: 1, b: 2, c: 3 }, '83a16101a16202a16303')
	})

	it('fixarray', () => {
		check([], '90')
		check([1, 2, 3, 4], '9401020304')
	})

	it('fixstr', () => {
		check('', 'a0')
		check('hello', 'a568656c6c6f')
	})

	it('nil', () => {
		check(null, 'c0')
	})

	it('false', () => {
		check(false, 'c2')
	})

	it('true', () => {
		check(true, 'c3')
	})

	it('bin 8', () => {
		check(new Uint8Array(), 'c400')
		check(Uint8Array.of(0), 'c40100')
		check(str('hello'), 'c40568656c6c6f')
	})

	it('bin 16', () => {
		check(str('a'.repeat(256)), 'c50100' + '61'.repeat(256))
	})

	it('bin 32', () => {
		check(str('a'.repeat(65536)), 'c600010000' + '61'.repeat(65536))
	})

	// float 32
	// JavaScript doesn't support single precision floating point numbers

	it('float 32', () => {
		const buf = Buffer.allocUnsafe(5)
		buf.writeUInt8(0xca, 0)
		buf.writeFloatBE(0.5, 1)
		checkDecode(0.5, buf.toString('hex'))
		check(NaN, 'ca7fc00000')
		check(Infinity, 'ca7f800000')
		check(-Infinity, 'caff800000')
	})

	it('float 64', () => {
		check(1.1, 'cb' + '3ff199999999999a')
		check(1234567891234567.5, 'cb' + '43118b54f26ebc1e')
	})

	it('uint 8', () => {
		check(128, 'cc80')
		check(255, 'ccff')
	})

	it('uint 16', () => {
		check(256, 'cd0100')
		check(65535, 'cdffff')
	})

	it('uint 32', () => {
		check(65536, 'ce00010000')
		check(4294967295, 'ceffffffff')
	})

	it('uint 64', () => {
		check(4294967296, 'cf0000000100000000')
		check(2 ** 53 - 1, 'cf001fffffffffffff')
		// unsafe unsigned integer
		check(2 ** 63, 'cf8000000000000000')
		check(2 ** 63 + 1024, 'cf8000000000000000')
	})

	// NOTE: We'll always encode a positive number as a uint, but we should be
	// able to decode a positive int value

	it('int 8', () => {
		checkDecode(127, 'd07f')
		checkDecode(32, 'd020')
		checkDecode(1, 'd001')
		checkDecode(0, 'd000')
		checkDecode(-1, 'd0ff')
		check(-33, 'd0df')
		check(-128, 'd080')
	})

	it('int 16', () => {
		checkDecode(32767, 'd17fff')
		checkDecode(128, 'd10080')
		checkDecode(1, 'd10001')
		checkDecode(0, 'd10000')
		checkDecode(-1, 'd1ffff')
		check(-129, 'd1ff7f')
		check(-32768, 'd18000')
	})

	it('int 32', () => {
		checkDecode(2147483647, 'd27fffffff')
		checkDecode(32768, 'd200008000')
		checkDecode(1, 'd200000001')
		checkDecode(0, 'd200000000')
		checkDecode(-1, 'd2ffffffff')
		check(-32769, 'd2ffff7fff')
		check(-2147483648, 'd280000000')
	})

	it('int 64', () => {
		checkDecode(Math.pow(2, 53), 'd30020000000000000')
		checkDecode(4294967296, 'd30000000100000000')
		checkDecode(1, 'd30000000000000001')
		checkDecode(0, 'd30000000000000000')
		checkDecode(-1, 'd3ffffffffffffffff')
		check(-2147483649, 'd3ffffffff7fffffff')
		check(-4294967297, 'd3fffffffeffffffff')
		check(-65437650001231, 'd3ffffc47c1c1de2b1')
		check(-1111111111111111, 'd3fffc0d7348ea8e39')
		check(-1532678092380345, 'd3fffa8e0992bfa747')
		check(-4503599627370496, 'd3fff0000000000000')
		check(-7840340234323423, 'd3ffe42540896a3a21')
		// Minimum safe signed integer
		check(-Math.pow(2, 53) + 1, 'd3ffe0000000000001')
		// unsafe signed integer
		check(-Math.pow(2, 63), 'd38000000000000000')
		check(-Math.pow(2, 63) - 1024, 'd38000000000000000')
	})

	it('fixext 1 / undefined', function () {
		check(undefined, 'd40000')
		checkDecode([127, str('a')], 'd47f61')
	})

	it('fixext 2', function () {
		checkDecode([127, str('ab')], 'd57f6162')
	})

	it('fixext 4', function () {
		checkDecode([127, str('abcd')], 'd67f61626364')
	})

	it('fixext 8', function () {
		checkDecode([127, str('abcd'.repeat(2))], 'd7' + '7f' + '61626364'.repeat(2))
	})

	it('fixext 16', function () {
		checkDecode([-128, str('abcd'.repeat(4))], 'd8' + '80' + '61626364'.repeat(4))
	})

	it('str 8', function () {
		check('α', 'a2ceb1')
		check('亜', 'a3e4ba9c')
		check('\uD83D\uDC26', 'a4f09f90a6')
		check('a'.repeat(32), 'd9' + '20' + '61'.repeat(32))
		check('a'.repeat(255), 'd9' + 'ff' + '61'.repeat(255))
	})

	it('str 16', function () {
		check('a'.repeat(256), 'da' + '0100' + '61'.repeat(256))
		check('a'.repeat(65535), 'da' + 'ffff' + '61'.repeat(65535))
	})

	it('str 32', function () {
		check('a'.repeat(65536), 'db' + '00010000' + '61'.repeat(65536))
	})

	it('array 16', function () {
		check(array(16), 'dc' + '0010' + '00'.repeat(16))
		check(array(65535), 'dc' + 'ffff' + '00'.repeat(65535))
	})

	it('array 32', function () {
		check(array(65536), 'dd' + '00010000' + '00'.repeat(65536))
	})

	it('map 16', function () {
		check(
			{ 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 },
			'de' + '0010' + 'a13000a13101a13202a13303a13404a13505a13606a13707a13808a13909a1610aa1620ba1630ca1640da1650ea1660f'
		)
		const map16 = map(65535)
		const encoded = encode(map16)
		expect(Buffer.from(encoded, 0, 3).toString('hex', 0, 3)).to.equal('deffff')
		expect(decode(encoded)).to.deep.equal(map16)
	})

	it('map 32', function () {
		const map32 = map(65536)
		const encoded = encode(map32)
		expect(Buffer.from(encoded, 0, 5).toString('hex', 0, 5)).to.equal('df00010000')
		expect(decode(encoded)).to.deep.equal(map32)
	})

	it('ArrayBuffer view', () => {
		expect(decode(Uint8Array.of(0x93, 1, 2, 3))).to.deep.equal([1, 2, 3])
	})

	it('offset ArrayBuffer view', () => {
		// Fill with junk before setting the encoded data
		const buffer = new ArrayBuffer(14),
			view = new Uint8Array(buffer).fill(0xFF)

		// Put the encoded data somewhere in the middle of the buffer
		view.set([0x93, 1, 2, 3], 4)

		expect(decode(new Uint8Array(buffer, 4, 4))).to.deep.equal([1, 2, 3])
	})

	it('utf-8', () => {
		// 1-byte
		expect(decode(encode('äß'))).to.equal('äß')
		// 2-byte
		expect(decode(encode('עִבְרִית'))).to.equal('עִבְרִית')
		// 3-byte
		expect(decode(encode('\u13DA'))).to.equal('\u13DA')
		// 4-byte
		expect(decode(encode('🌐'))).to.equal('🌐')
	})

	it('all formats', function () {
		this.timeout(20000)
		const expected = {
			unsigned: [1, 2, 3, 4, { b: { c: [128, 256, 65536, 4294967296] } }],
			signed: [-1, -2, -3, -4, { b: { c: [-33, -129, -32769, -2147483649] } }],
			bin: [Uint8Array.of(1, 2, 3), Uint8Array.from('1'.repeat(256)), Uint8Array.from('2'.repeat(65536))],
			str: ['abc', 'g'.repeat(32), 'h'.repeat(256), 'i'.repeat(65536)],
			array: [[], array(16), array(65536)],
			map: {},
			nil: null,
			bool: { 'true': true, 'false': false, both: [true, false, false, false, true] },
			fixext: [undefined],
			utf8: ['α', '亜', '\uD83D\uDC26'],
			float: [1.1, 1234567891234567.5, Infinity, -Infinity, NaN],
			map16: map(65535),
			map32: map(65536)
		}
		expected.map['a'.repeat(32)] = { a: 'a', b: 'b', c: 'c' }
		expected.map['b'.repeat(256)] = { a: { b: 1, c: 1, d: 1, e: { f: { g: 2, h: 2 } } } }
		expected.map['c'.repeat(65536)] = [{ a: { b: 1, c: 1, d: 1, e: { f: [{ g: 2, h: 2 }] } } }]

		expect(decode(encode(expected))).to.deep.equal(expected)
	})

	it('10000', function () {
		expect(decode(encode(fixture))).to.deep.equal(fixture)
	})
})
