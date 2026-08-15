import { useSyncExternalStore } from "react";

/**
 * Whether the profile sheet is showing. The same shape as `guides.ts`, for the
 * same reason: the button that opens it lives in the native toolbar and the
 * sheet itself lives in the calculator's SwiftUI tree, and those two are
 * siblings under the navigator with no shared parent to hang a provider on.
 */
let open = false;
const listeners = new Set<() => void>();

export function setProfileOpen(next: boolean) {
	open = next;
	for (const listener of listeners) {
		listener();
	}
}

export const openProfile = () => setProfileOpen(true);

export const useProfileOpen = () =>
	useSyncExternalStore(
		(listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		() => open
	);
