// dsh-continue-all — browser half.
//
// Loaded by dsh-client-modules at /plugins/dsh-continue-all/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table. The
// registered id MUST be the package name.
//
// Feature: a "Continue all" entry in the sidebar footer. Clicking it asks the
// host half for sessions whose stored log ends inside an open turn (or closed
// its last turn as `interrupted`), then sends the literal prompt `continue` to
// every returned session that the list still shows as idle. This is the batch
// form of opening each session and pressing Continue.
//
// The scan is a host read because `turnBoundary` is not a wire projection: the
// client cannot see an open turn from the session list. The host route caches
// per persistence revision, so repeated clicks re-read only logs that moved.
//
// Continuing one session means opening it through `sessions.using` (the same
// retention the composer uses) and sending `continue` through
// `session.prompt(..., "queue")`. The host keeps the resulting turn alive after
// the client reference is released.

window.__ModuleLoader__.load({
	id: "dsh-continue-all",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const jsx = require("react/jsx-runtime").jsx;
		const jsxs = require("react/jsx-runtime").jsxs;
		const Fragment = require("react/jsx-runtime").Fragment;
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const clientStore = require("@deepseek-ai/dsh-client-store");

		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-continue-all";
		/** Prompt text sent verbatim as one text block. */
		const PROMPT = "continue";
		/** Host scan route on the shared authenticated API channel. */
		const SCAN_URL = "/api/continue-all/scan";
		/** Wire contract: session id plus the time its turn stopped. */
		const SCAN_VERSION = 2;
		/** Default recent window; older sessions stay opt-in. */
		const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000;
		const STYLE_ID = "dsh-continue-all-style";
		const CLASS_LAYER = "dca-layer";
		const CLASS_RAIL = "dca-rail";
		const CLASS_BUTTON = "dca-button";
		const CLASS_LABEL = "dca-label";
		const CLASS_NOTE = "dca-note";
		const CLASS_LIST = "dca-list";
		const CLASS_ROW = "dca-row";
		const CLASS_ROW_TITLE = "dca-row-title";
		const CLASS_ROW_META = "dca-row-meta";
		const CLASS_ERROR = "dca-error";
		const CLASS_STATUS = "dca-status";
		const CLASS_ROW_DATE = "dca-row-date";
		const CLASS_OLDER = "dca-older";

		const en = {
			"button.label": "Continue all",
			"button.title": "Continue sessions stopped by an unexpected exit",
			"dialog.title": "Continue interrupted sessions",
			"dialog.description.one": "One session stopped when DSH exited before its turn finished.",
			"dialog.description.other": "{n} sessions stopped when DSH exited before their turns finished.",
			"dialog.warning": 'Each session receives "continue" and starts a new turn.',
			"dialog.window": "Only sessions interrupted in the last 6 hours are selected.",
			"dialog.older.one": "Also include 1 older session",
			"dialog.older.other": "Also include {n} older sessions",
			"dialog.recentEmpty": "No sessions were interrupted in the last 6 hours.",
			"dialog.hostOutdated": "The host half is out of date. Restart DSH, then try again.",
			"dialog.list": "Interrupted sessions",
			"dialog.cancel": "Cancel",
			"dialog.continue": "Continue all",
			"dialog.close": "Close",
			"dialog.scanning": "Checking stored sessions for turns left open by an earlier exit…",
			"dialog.running": "Continuing {done} of {total}…",
			"dialog.empty": "No sessions were left open by an unexpected exit.",
			"dialog.summary": "Started {ok} of {total} sessions.",
			"dialog.error": "The scan failed.",
			"status.pending": "Waiting",
			"status.started": "Started",
			"status.failed": "Failed",
		};

		const zh = {
			"button.label": "全部继续",
			"button.title": "继续因意外退出而停止的会话",
			"dialog.title": "继续中断的会话",
			"dialog.description.one": "有 1 个会话在轮次结束前因 DSH 退出而停止。",
			"dialog.description.other": "有 {n} 个会话在轮次结束前因 DSH 退出而停止。",
			"dialog.warning": "每个会话都会收到“continue”并开始新一轮。",
			"dialog.window": "默认只选中最近 6 小时内中断的会话。",
			"dialog.older.one": "同时包含 1 个更早的会话",
			"dialog.older.other": "同时包含 {n} 个更早的会话",
			"dialog.recentEmpty": "最近 6 小时内没有中断的会话。",
			"dialog.hostOutdated": "后端部分尚未更新。请重启 DSH 后再试。",
			"dialog.list": "中断的会话",
			"dialog.cancel": "取消",
			"dialog.continue": "全部继续",
			"dialog.close": "关闭",
			"dialog.scanning": "正在检查因上次退出而留下未结束轮次的会话…",
			"dialog.running": "正在继续第 {done} 个，共 {total} 个…",
			"dialog.empty": "没有因意外退出而留下的会话。",
			"dialog.summary": "已开始 {ok} 个，共 {total} 个会话。",
			"dialog.error": "检查失败。",
			"status.pending": "等待",
			"status.started": "已开始",
			"status.failed": "失败",
		};

		const ja = {
			"button.label": "すべて続行",
			"button.title": "予期しない終了で止まったセッションを続行",
			"dialog.title": "中断したセッションを続行",
			"dialog.description.one": "DSHの終了により、1件のセッションがターンの途中で止まりました。",
			"dialog.description.other": "DSHの終了により、{n}件のセッションがターンの途中で止まりました。",
			"dialog.warning": "各セッションに「continue」を送り、新しいターンを開始します。",
			"dialog.window": "直近6時間に中断したセッションだけを選択しています。",
			"dialog.older.one": "1件の古いセッションも含める",
			"dialog.older.other": "{n}件の古いセッションも含める",
			"dialog.recentEmpty": "直近6時間に中断したセッションはありません。",
			"dialog.hostOutdated": "ホスト側が古いままです。DSHを再起動してから再試行してください。",
			"dialog.list": "中断したセッション",
			"dialog.cancel": "キャンセル",
			"dialog.continue": "すべて続行",
			"dialog.close": "閉じる",
			"dialog.scanning": "以前の終了でターンが終わっていないセッションを確認しています…",
			"dialog.running": "{total}件中{done}件を続行しています…",
			"dialog.empty": "予期しない終了で残ったセッションはありません。",
			"dialog.summary": "{total}件中{ok}件のセッションを開始しました。",
			"dialog.error": "確認に失敗しました。",
			"status.pending": "待機中",
			"status.started": "開始済み",
			"status.failed": "失敗",
		};

		/** Inject the footer and dialog styles once. App CSS variables follow the theme. */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent =
				"." + CLASS_LAYER +
				"{flex:none;align-items:center;width:100%;height:42px;margin:8px 0 0;display:flex;position:relative}" +
				"." + CLASS_LAYER + "." + CLASS_RAIL + "{width:36px;height:36px;margin:0}" +
				"." + CLASS_BUTTON +
				"{width:calc(100% + 4px);height:42px;color:var(--dsw-alias-label-primary);" +
				"cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;" +
				"gap:8px;margin:0 -2px;padding:0 10px 0 8px;font-family:inherit;font-size:14px;" +
				"display:inline-flex;overflow:hidden;text-align:left}" +
				"." + CLASS_BUTTON + ":hover:not(:disabled)" +
				"{background:var(--dsw-alias-interactive-bg-hover)}" +
				"." + CLASS_BUTTON + ":focus-visible" +
				"{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:-2px}" +
				"." + CLASS_BUTTON + ":disabled{opacity:.45;cursor:default}" +
				"." + CLASS_RAIL + " ." + CLASS_BUTTON +
				"{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0}" +
				"." + CLASS_LABEL +
				"{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}" +
				"." + CLASS_NOTE +
				"{color:var(--dsw-alias-label-tertiary);margin:0 0 10px;font-size:12px;line-height:18px}" +
				"." + CLASS_LIST +
				"{max-height:320px;overflow-y:auto;margin:0;padding:0;list-style:none;display:flex;" +
				"flex-direction:column;gap:2px}" +
				"." + CLASS_ROW +
				"{padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;gap:2px}" +
				"." + CLASS_ROW + ":hover{background:var(--dsw-alias-interactive-bg-hover)}" +
				"." + CLASS_ROW_TITLE +
				"{color:var(--dsw-alias-label-primary);font-size:13px;line-height:18px;" +
				"overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
				"." + CLASS_ROW_META +
				"{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;" +
				"overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
				"." + CLASS_STATUS +
				"{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}" +
				"." + CLASS_ERROR +
				"{color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px;" +
				"overflow-wrap:anywhere}" +
				"." + CLASS_OLDER + "{margin:0 0 10px}" +
				"." + CLASS_ROW_DATE +
				"{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}";
			document.head.appendChild(style);
		}

		/** Basename of a host-spelled path, accepting both separators. */
		function folderLabel(cwd) {
			const parts = String(cwd).split(/[\\/]/).filter((part) => part.length > 0);
			return parts.length === 0 ? String(cwd) : parts[parts.length - 1];
		}

		/**
		 * Turn scanned items into rows the list still shows as continue-able.
		 *
		 * The host already excludes running agents and supplies when each turn
		 * stopped. The list adds the client's current view: unknown ids, blank
		 * rows, subagents, and archived sessions stay out.
		 *
		 * @param items - host scan rows carrying `sessionId` and `time`.
		 * @param list - current session list snapshot.
		 * @param archived - archived session ids.
		 * @returns one row per continue-able session, in scan order.
		 */
		function entriesFromItems(items, list, archived) {
			const entries = [];
			const seen = new Set();
			for (const item of items) {
				if (item === null || typeof item !== "object") continue;
				const id = item.sessionId;
				const time = item.time;
				if (typeof id !== "string" || !Number.isFinite(time)) continue;
				if (seen.has(id)) continue;
				seen.add(id);
				const row = list.byId[id];
				if (row === void 0 || row.blank || row.running) continue;
				if (row.origin === "subagent" || archived.has(id)) continue;
				entries.push({
					sessionId: id,
					title: row.displayTitle || row.title || id,
					cwd: row.cwd,
					time,
				});
			}
			return entries;
		}

		const CLOSED = {
			open: false,
			phase: "idle",
			recent: [],
			older: [],
			includeOlder: false,
			results: [],
			started: 0,
			total: 0,
			since: 0,
			cutoff: 0,
			error: null,
		};

		/**
		 * Sidebar footer entry.
		 *
		 * @param props - slot kit plus the shared dialog store and `begin`.
		 */
		function ContinueAllButton(props) {
			const dialog = props.useDialog((snapshot) => snapshot);
			const busy = dialog.phase === "scanning" || dialog.phase === "running";
			const title = props.t("button.title");
			return jsx("div", {
				className: CLASS_LAYER + (props.wide ? "" : " " + CLASS_RAIL),
				children: jsx(primitives.Tooltip, {
					label: title,
					delayMs: 500,
					children: jsx("button", {
						type: "button",
						className: CLASS_BUTTON,
						"aria-label": title,
						disabled: busy,
						onClick: () => {
							props.begin();
						},
						children: [
							jsx(primitives.IconPlayOutlineRegular, { size: props.wide ? 16 : 18 }),
							props.wide &&
								jsx("span", { className: CLASS_LABEL, children: props.t("button.label") }),
						],
					}),
				}),
			});
		}

		/** One dialog row: title, workspace, date when older, and its outcome. */
		function ResultRow({ entry, t, showDate }) {
			const status = entry.status ?? "pending";
			const meta = entry.cwd === void 0 || entry.cwd === "" ? null : folderLabel(entry.cwd);
			const date = showDate
				? new Date(entry.time).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
						day: "numeric",
					})
				: null;
			return jsxs("li", {
				className: CLASS_ROW,
				children: [
					jsx("span", { className: CLASS_ROW_TITLE, children: entry.title }),
					meta !== null && jsx("span", { className: CLASS_ROW_META, children: meta }),
					date !== null && jsx("span", { className: CLASS_ROW_DATE, children: date }),
					status !== "pending" &&
						jsx("span", {
							className: CLASS_STATUS,
							children: t(status === "started" ? "status.started" : "status.failed"),
						}),
					entry.error != null &&
						jsx("span", { className: CLASS_ERROR, role: "alert", children: entry.error }),
				],
			});
		}

		/**
		 * Scanning, confirmation, progress, and result surface.
		 *
		 * @param props - slot kit plus the shared dialog store and its commands.
		 */
		function ContinueAllDialog(props) {
			const dialog = props.useDialog((snapshot) => snapshot);
			if (!dialog.open) return null;
			const t = props.t;
			const busy = dialog.phase === "scanning" || dialog.phase === "running";
			const description =
				dialog.phase === "scanning"
					? t("dialog.scanning")
					: dialog.phase === "confirm"
						? dialog.total > 0
							? t(dialog.total === 1 ? "dialog.description.one" : "dialog.description.other", {
									n: dialog.total,
								})
							: t(dialog.older.length > 0 ? "dialog.recentEmpty" : "dialog.empty")
						: dialog.phase === "running"
							? t("dialog.running", {
									done: dialog.results.filter((entry) => entry.status !== "pending").length,
									total: dialog.total,
								})
							: dialog.phase === "done"
								? t("dialog.summary", { ok: dialog.started, total: dialog.total })
								: t("dialog.error");
			const footer =
				dialog.phase === "confirm" && dialog.total > 0
					? jsxs(Fragment, {
							children: [
								jsx(primitives.Button, {
									variant: "outline",
									onClick: () => {
										props.dismiss();
									},
									children: t("dialog.cancel"),
								}),
								jsx(primitives.Button, {
									variant: "outline",
									onClick: () => {
										props.run();
									},
									children: t("dialog.continue"),
								}),
							],
						})
					: dialog.phase === "confirm" || dialog.phase === "done" || dialog.phase === "error"
						? jsx(primitives.Button, {
								variant: "outline",
								onClick: () => {
									props.dismiss();
								},
								children: t("dialog.close"),
							})
						: void 0;
			return jsxs(primitives.Modal, {
				open: true,
				onClose: () => {
					if (!busy) props.dismiss();
				},
				closeLabel: t("dialog.close"),
				title: t("dialog.title"),
				description,
				footer,
				children: [
					dialog.phase === "confirm" &&
						jsx("p", { className: CLASS_NOTE, children: t("dialog.window") }),
					dialog.phase === "confirm" &&
						dialog.total > 0 &&
						jsx("p", { className: CLASS_NOTE, children: t("dialog.warning") }),
					dialog.phase === "confirm" &&
						dialog.older.length > 0 &&
						jsx("div", {
							className: CLASS_OLDER,
							children: jsx(primitives.Checkbox, {
								label: t(
									dialog.older.length === 1 ? "dialog.older.one" : "dialog.older.other",
									{ n: dialog.older.length },
								),
								checked: dialog.includeOlder,
								onChange: (checked) => {
									props.setIncludeOlder(checked);
								},
							}),
						}),
					dialog.error != null &&
						jsx("p", {
							className: CLASS_ERROR,
							role: "alert",
							children:
								dialog.error === "host-outdated"
									? t("dialog.hostOutdated")
									: dialog.error,
						}),
					dialog.total > 0 &&
						jsxs("ul", {
							className: CLASS_LIST,
							"aria-label": t("dialog.list"),
							children: dialog.results.map((entry) =>
								jsx(
									ResultRow,
									{ entry, t, showDate: entry.time < dialog.cutoff },
									entry.sessionId,
								),
							),
						}),
					dialog.phase === "running" &&
						jsx("div", {
							className: CLASS_NOTE,
							role: "status",
							children: t("dialog.running", {
								done: dialog.results.filter((entry) => entry.status !== "pending").length,
								total: dialog.total,
							}),
						}),
				],
			});
		}

		exports.inject = ["slots", "locale", "sessions", "workspaces"];

		/**
		 * Register dictionaries, styles, the footer entry, and its overlay.
		 *
		 * @param ctx - client root context.
		 */
		exports.apply = (ctx) => {
			const sessions = ctx.sessions;
			const workspaces = ctx.get("workspaces");
			const dialog = clientStore.createSnapshotStore(CLOSED);

			/** Archived ids at the moment of a scan; a click reads the current set. */
			const archivedIds = () =>
				new Set(workspaces?.list.getSnapshot().archivedSessionIds ?? []);

			/** Scan the host, then open the confirmation step over the filtered rows. */
			const begin = async () => {
				const current = dialog.getSnapshot();
				if (current.phase === "scanning" || current.phase === "running") return;
				dialog.set({ ...CLOSED, open: true, phase: "scanning" });
				let body;
				try {
					const response = await fetch(SCAN_URL, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: "{}",
						credentials: "same-origin",
					});
					if (!response.ok) throw new Error(`HTTP ${response.status}`);
					body = await response.json();
					if (body?.version !== SCAN_VERSION || !Array.isArray(body.items)) {
						throw new Error("host-outdated");
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					dialog.set({
						...CLOSED,
						open: true,
						phase: "error",
						error: message === "host-outdated" ? "host-outdated" : message,
					});
					return;
				}
				const entries = entriesFromItems(
					body.items,
					sessions.list.getSnapshot(),
					archivedIds(),
				).sort((left, right) => right.time - left.time);
				const since = Number.isFinite(body.since) ? body.since : Date.now();
				const cutoff = since - RECENT_WINDOW_MS;
				const recent = entries.filter((entry) => entry.time >= cutoff);
				const older = entries.filter((entry) => entry.time < cutoff);
				dialog.set({
					open: true,
					phase: "confirm",
					recent,
					older,
					includeOlder: false,
					results: recent.map((entry) => ({
						...entry,
						status: "pending",
						error: null,
					})),
					started: 0,
					total: recent.length,
					since,
					cutoff,
					error: null,
				});
			};

			/** Close the dialog unless a scan or batch is still running. */
			const dismiss = () => {
				const phase = dialog.getSnapshot().phase;
				if (phase === "scanning" || phase === "running") return;
				dialog.set(CLOSED);
			};

			/** Add or remove the older cluster before the batch starts. */
			const setIncludeOlder = (checked) => {
				const snapshot = dialog.getSnapshot();
				if (snapshot.phase !== "confirm") return;
				const selected = checked
					? [...snapshot.recent, ...snapshot.older]
					: snapshot.recent;
				dialog.set({
					...snapshot,
					includeOlder: checked,
					results: selected.map((entry) => ({
						...entry,
						status: "pending",
						error: null,
					})),
					total: selected.length,
				});
			};

			/** Send `continue` to every candidate, one admission at a time. */
			const run = async () => {
				const snapshot = dialog.getSnapshot();
				if (snapshot.phase !== "confirm") return;
				dialog.set({ ...snapshot, phase: "running" });
				for (let index = 0; index < snapshot.results.length; index += 1) {
					const candidate = snapshot.results[index];
					let failure = null;
					try {
						const result = await sessions.using(
							candidate.sessionId,
							{ source: "continueAll" },
							(reference) =>
								reference.binding.session.prompt(
									[{ type: "text", text: PROMPT }],
									"queue",
								),
						);
						if (!result.ok) failure = `${result.error.code}: ${result.error.message}`;
					} catch (error) {
						failure = error instanceof Error ? error.message : String(error);
					}
					const current = dialog.getSnapshot();
					dialog.set({
						...current,
						results: current.results.map((entry, entryIndex) =>
							entryIndex === index
								? {
										...entry,
										status: failure === null ? "started" : "failed",
										error: failure,
									}
								: entry,
						),
						started: current.started + (failure === null ? 1 : 0),
					});
				}
				dialog.set({ ...dialog.getSnapshot(), phase: "done" });
			};

			ctx.effect(() => ctx.locale.register(NS, { en, zh, ja }), "continue-all: dictionaries");
			ctx.effect(() => ensureStyles(), "continue-all: styles");

			ctx.slots.inject("sidebar.footer.action", () =>
				ctx.slots.register(
					{
						name: "sidebar.footer.action",
						id: "continue-all",
						order: 150,
						locale: NS,
						inject: () => ({
							hooks: { dialog },
							begin,
						}),
					},
					ContinueAllButton,
				),
			);

			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{
						name: "shell.overlay",
						id: "continue-all-dialog",
						locale: NS,
						inject: () => ({
							hooks: { dialog },
							dismiss,
							run,
							setIncludeOlder,
						}),
					},
					ContinueAllDialog,
				),
			);
		};

		return module.exports;
	},
});
