import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tailContinues } from '../lib/host.js'

const start = () => ({ type: 'turn/start', data: { turn: 1 } })
const end = (kind) => ({ type: 'turn/end', data: { reason: { kind } } })

test('an open tail means the turn never closed', () => {
	assert.equal(tailContinues([start(), { type: 'step/start' }], 0), true)
})

test('a completed turn is not continued', () => {
	assert.equal(tailContinues([start(), end('success')], 0), false)
})

test('a crash-closed turn is continued', () => {
	assert.equal(tailContinues([start(), end('interrupted')], 0), true)
})

test('a later completed turn clears an earlier interrupted closer', () => {
	assert.equal(tailContinues([end('interrupted'), start(), end('success')], 0), false)
})

test('an interrupted closer followed by a new open turn is continued', () => {
	assert.equal(tailContinues([end('interrupted'), start()], 0), true)
})

test('user abort and model errors stay out of the batch', () => {
	assert.equal(tailContinues([start(), end('aborted')], 0), false)
	assert.equal(tailContinues([start(), end('error')], 0), false)
})

test('an empty log has nothing to continue', () => {
	assert.equal(tailContinues([], 0), false)
})

test('a tail starting mid-log is treated as an open turn', () => {
	assert.equal(tailContinues([{ type: 'step/start' }], 100), true)
})

test('a tail starting mid-log that reaches a closer follows that closer', () => {
	assert.equal(tailContinues([end('success')], 100), false)
})
