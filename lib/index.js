/**
 * Package entry for dsh-continue-all.
 *
 * The implementation lives in `host.js` so a running DSH can mount a fresh
 * copy through the profile patch while the package entry stays stable.
 */
export * from './host.js'
