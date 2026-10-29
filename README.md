# dsh-continue-all

DSH Web UI plugin: one sidebar entry continues every session whose turn was left open by an unexpected DSH exit.

When DSH is killed, crashes, or times out mid-turn, the turn stays open in the stored log. On the next resume the agent loop closes it as `interrupted`, and the session sits idle in the sidebar with a failure notice. The usual fix is to open each affected session and press Continue. This plugin does that in one step.

## Install

Use the DSH plugin manager (Plugins → Add plugin) with the spec:

```
github:mkpoli/dsh-continue-all
```

Or install from the command line and add the bundle to the profile:

```sh
dsh plugin --profile web add github:mkpoli/dsh-continue-all
```

Then add `"dsh-continue-all"` to `dsh.profile.bundles` in `~/.dsh/profiles/web/package.json` and restart `dsh web`.

A prebuilt tarball is attached to the release:

```sh
dsh plugin --profile web add https://github.com/mkpoli/dsh-continue-all/releases/latest/download/dsh-continue-all.tgz
```

For a local checkout, `link:/path/to/dsh-continue-all` works the same way.

## Use

The sidebar footer shows **Continue all**. Clicking it scans stored sessions, then lists the ones that stopped mid-turn. Confirming sends the literal prompt `continue` to each session in turn, through the same session retention and `prompt(..., "queue")` path the composer uses. The dialog shows per-session progress and failures.

Only sessions interrupted in the last 6 hours are selected by default. Older interrupted sessions are listed behind an opt-in checkbox, so a batch cannot reach sessions from earlier crashes or abandoned work by accident.

Sessions are left out when they are:

- running (their turn is live work, not an interrupted one);
- blank, a subagent, or archived;
- waiting for an approval or an answer.

Archived sessions stay archived. Unarchive one first if it should be continued.

## How detection works

The host half exposes `POST /api/continue-all/scan` on DSH's authenticated `/api` channel. It lists visible stored sessions and reads each stored log. A session qualifies when its tail ends inside an open turn, or when its last `turn/end` reason is `interrupted`. The response carries the time that turn stopped; the client uses it to separate the recent window from older sessions.

The scan caches its answer per persistence revision, so later scans read only logs that changed since the previous one. The first scan after a restart reads every stored log and can take a while on a large history; the result is kept for the lifetime of the process. A warm scan starts shortly after the host loads, so the first click usually finds it finished.

The client requires scan response version 2. After an update, restart `dsh web` once so the host and client halves match; until then the dialog reports that the host half is out of date instead of starting anything.

Sessions whose logs cannot be read are skipped and logged on the host.

## Development

```sh
npm test
```

The host scan is split into a pure `tailDecision` predicate and a persistence reader, so the turn-boundary rules and stop times are tested without a live DSH.

## License

MIT
