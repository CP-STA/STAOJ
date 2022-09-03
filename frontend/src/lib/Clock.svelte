<svelte:options immutable={true} />

<script>
	export /**
	 * @type {{ date: { toLocaleTimeString: (arg0: string) => any; }; }}
	 */
	let time;
	export /**
	 * @type {any}
	 */
	let judgeCount;
	/**
	 * @param {{ date?: { toLocaleTimeString: (arg0: string) => any; }; synced?: any; }} time
	 * @param {number} judgeCount
	 */
	function clockStatus(time, judgeCount) {
		if (time.synced && judgeCount != 0) {
			return {
				color: 'success',
				tooltip: 'The clock is synced with server time with ± 1s accuracy'
			};
		} else if (time.synced && judgeCount == 0) {
			return {
				color: 'warning',
				tooltip: 'The clock is synced but the code judging system is offline'
			};
		} else if (!time.synced && judgeCount != 0) {
			return { color: 'secondary', tooltip: 'The clock is not synced' };
		} else if (!time.synced && judgeCount == 0) {
			return {
				color: 'secondary',
				tooltip: 'The clock is not synced and the code judging system is offline'
			};
		} else {
			return { color: 'warning', tooltip: 'Unknown Error (E4)' };
		}
	}
</script>

<span
	id="clock"
	class="btn btn-{clockStatus(time, judgeCount)
		.color} pt-2 pb-2 ms-2 border-0 font-monospace css-tooltip"
	title="hello world"
	data-tooltip={clockStatus(time, judgeCount).tooltip}>{time.date.toLocaleTimeString('en-GB')}</span
>

<style>
	.css-tooltip {
		position: relative;
	}
	.css-tooltip:hover:after {
		content: attr(data-tooltip);
		background: #000;
		padding: 6px;
		border-radius: 6px;
		display: inline-block;
		position: absolute;
		transform: translate(-50%, 54px);
		margin: 0 auto;
		color: #fff;
		min-width: 100px;
		min-width: 150px;
		top: -5px;
		font-family: var(--bs-body-font-family);
		font-size: 9pt;
		font-weight: var(--bs-body-font-weight);
		line-height: var(--bs-body-line-height);
		left: 50%;
		text-align: center;
	}
	.css-tooltip:hover:before {
		top: -5px;
		left: 50%;
		border: solid transparent;
		content: ' ';
		height: 0;
		width: 0;
		position: absolute;
		pointer-events: none;
		border-color: rgba(0, 0, 0, 0);
		border-top-color: #000;
		border-width: 5px;
		margin-left: -5px;
		transform: translate(0, 0px);
	}
</style>
