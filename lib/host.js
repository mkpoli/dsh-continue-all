/**
 * Host half of dsh-continue-all.
 *
 * The Web client needs one fact that the session list does not carry: which
 * stored sessions have a turn that was never closed, or whose last turn was
 * closed as `interrupted`. Neither is a wire projection, so this plugin reads
 * the tail of every stored log through the persistence seam and exposes the
 * answer at `POST /api/continue-all/scan`.
 *
 * Reads are cached by the persistence revision: a revision change is the only
 * signal that a stored log moved, so repeated scans read only sessions whose
 * logs changed since the previous scan. The route is registered on the shared
 * authenticated `/api` channel, which admits owner peers only.
 *
 * @module dsh-continue-all
 */
export const name = 'dsh-continue-all'

/** Services the scan and its authenticated route depend on. */
export const inject = ['connection', 'sessionPersistence', 'agents']

/** Events read from one log tail; enough to cross any completed turn's closer. */
const TAIL_EVENTS = 64

/**
 * Whether a log tail ends inside an open turn, or its last closed turn ended as
 * `interrupted`.
 *
 * @param events - event slice in seq order.
 * @param from - first logical seq of the slice; a non-zero start means the
 *   slice begins mid-log, inside whatever turn owns that position.
 * @returns whether the session should be continued.
 */
export function tailContinues(events, from = 0) {
	// A tail slice that starts mid-log begins inside whatever turn owns that
	// position unless a closer appears later in the slice.
	let open = from > 0
	let lastReason
	for (const event of events) {
		if (event.type === 'turn/start') {
			open = true
			lastReason = undefined
		} else if (event.type === 'turn/end') {
			open = false
			lastReason = event.data.reason.kind
		}
	}
	return open || lastReason === 'interrupted'
}

/**
 * Read one stored session's tail and apply {@link tailContinues}.
 *
 * @param snapshot - persistence listing row for the session.
 * @param persistence - mounted persistence service.
 * @returns whether the session should be continued.
 */
async function inspect(snapshot, persistence) {
	const handle = await persistence.open(snapshot.header.id, 'read')
	try {
		const from = snapshot.eventCount === undefined ? 0 : Math.max(0, snapshot.eventCount - TAIL_EVENTS)
		const { events } =
			snapshot.eventCount === undefined
				? await handle.read()
				: await handle.read(from, TAIL_EVENTS)
		return tailContinues(events, from)
	} finally {
		await handle.close()
	}
}

/**
 * Run one async operation over many items with bounded concurrency.
 *
 * Reading a stored log is the expensive step; a handful of concurrent reads
 * keeps the scan off the single-thread path without opening every log at once.
 *
 * @template T, R
 * @param items - inputs in scan order.
 * @param limit - maximum in-flight operations.
 * @param operation - per-item async work.
 * @returns results in input order.
 */
async function mapLimit(items, limit, operation) {
	const results = new Array(items.length)
	let next = 0
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (true) {
			const index = next++
			if (index >= items.length) return
			results[index] = await operation(items[index])
		}
	})
	await Promise.all(workers)
	return results
}

/** Concurrent stored-log reads during one scan. */
const SCAN_CONCURRENCY = 6

/**
 * Mount the authenticated scan route.
 *
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
	/** Interrupted state per session, valid only for the recorded revision. */
	const results = new Map()
	let inflight

	/** Scan every visible stored session, reusing rows whose revision did not move. */
	const scan = () => {
		if (inflight !== undefined) return inflight
		inflight = (async () => {
			const snapshots = await ctx.sessionPersistence.list()
			const stats = { total: snapshots.length, running: 0, cached: 0, read: 0 }
			const targets = []
			for (const snapshot of snapshots) {
				const header = snapshot.header
				if (header.cwd === undefined || header.origin === 'subagent') continue
				if (ctx.agents.get(header.id)?.status === 'running') {
					stats.running += 1
					continue
				}
				const cached = results.get(header.id)
				if (cached !== undefined && cached.revision === snapshot.revision) {
					stats.cached += 1
					continue
				}
				targets.push(snapshot)
			}
			await mapLimit(targets, SCAN_CONCURRENCY, async (snapshot) => {
				try {
					const hit = await inspect(snapshot, ctx.sessionPersistence)
					results.set(snapshot.header.id, { revision: snapshot.revision, interrupted: hit })
					stats.read += 1
				} catch (error) {
					// A log this process cannot read is not a session to continue; keep
					// the scan going and leave the failure in the host log.
					if (ctx.logger?.warn !== undefined) ctx.logger.warn(error)
					else console.warn('[dsh-continue-all] scan skipped a session:', error)
				}
			})
			const interrupted = []
			for (const snapshot of snapshots) {
				const header = snapshot.header
				if (header.cwd === undefined || header.origin === 'subagent') continue
				if (results.get(header.id)?.interrupted === true) interrupted.push(header.id)
			}
			return { sessionIds: interrupted, stats }
		})().finally(() => {
			inflight = undefined
		})
		return inflight
	}

	// Warm the revision cache while the host is idle, so the first click after a
	// restart usually finds the scan already finished.
	ctx.effect(() => {
		const timer = setTimeout(() => {
			scan().catch((error) => {
				if (ctx.logger?.warn !== undefined) ctx.logger.warn(error)
				else console.warn('[dsh-continue-all] warm scan failed:', error)
			})
		}, 3000)
		return () => {
			clearTimeout(timer)
		}
	}, 'continue-all: warm scan')

	ctx.effect(
		() =>
			ctx.connection.fetch.register({
				path: '/api/continue-all/scan',
				methods: ['POST'],
				requestBody: 'buffered',
				fetch: async () => Response.json(await scan()),
			}),
		'continue-all: authenticated scan route',
	)
}
