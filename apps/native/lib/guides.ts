import { useSyncExternalStore } from "react";

/**
 * Whether the calculator shows its guide labels — the SHAPE / COLOR / CLARITY
 * captions and "DISCOUNT OFF LIST". A module store rather than context because
 * the drawer content and the calculator screen are siblings under the
 * navigator, so there is no shared parent to hang a provider on.
 */
let guides = true;
const listeners = new Set<() => void>();

export function toggleGuides() {
	guides = !guides;
	for (const listener of listeners) {
		listener();
	}
}

export const useGuides = () =>
	useSyncExternalStore(
		(listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		() => guides
	);
