import { useSyncExternalStore } from "react";

/**
 * Whether the calculators show their guide labels — the SHAPE / COLOR / CLARITY
 * captions and "DISCOUNT OFF LIST". A module store rather than context because
 * on native the drawer content and the calculator screen are siblings under the
 * navigator, so there is no shared parent to hang a provider on; the web sidebar
 * and its screens sit the same way under the route group's layout.
 */
let guides = true;
const listeners = new Set<() => void>();

export function toggleGuides() {
	guides = !guides;
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

const getSnapshot = () => guides;

/**
 * The third argument is the server snapshot, which Next's render pass demands —
 * without it React throws rather than falling back to the client one. The store
 * starts at the same value in both environments, so it is the same function.
 */
export const useGuides = () =>
	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
