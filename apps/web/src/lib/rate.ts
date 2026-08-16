"use client";

import { useSyncExternalStore } from "react";

/**
 * The dealer's own USD→INR rate, typed over the CDN's.
 *
 * A module store rather than context because the input lives in the sidebar and
 * the number it drives is on the calculator — siblings under the route group's
 * layout, with no shared parent to hang a provider on. The same reason the
 * guides setting is one.
 *
 * Empty means "use the CDN rate"; `useRate` resolves that so callers never have
 * to decide which of the two is in force.
 */

let rateText = "";
const listeners = new Set<() => void>();

export function setRateText(next: string) {
	rateText = next;
	for (const listener of listeners) {
		listener();
	}
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const getSnapshot = () => rateText;

export function useRate() {
	const text = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	const typed = Number.parseFloat(text);
	return {
		rateText: text,
		setRateText,
		/** The typed rate when there is a usable one, else null for the CDN's. */
		typedRate: Number.isFinite(typed) && typed > 0 ? typed : null,
	};
}
