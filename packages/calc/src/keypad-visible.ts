import { useSyncExternalStore } from "react";

/**
 * Whether the calculators' keypad is dismissed.
 *
 * The keypad is the largest single block on either screen — four key rows and
 * the gaps between them — and it is only needed while a number is being typed.
 * Dismissing it hands that height to the card above, which is what lets the
 * grades wheels open up and, on the rough screen, the whole parts list show at
 * once.
 *
 * A module store rather than context, for the reason [[guides]] gives: the
 * drawer content and the calculator screen are siblings under the navigator, so
 * there is no shared parent to hang a provider on. One setting for all the
 * screens, so the keypad does not reappear on the way from polish to rough.
 *
 * Not persisted. A dismissed keypad is a thing you did a moment ago to see more
 * of one stone, not a preference about the app — a fresh launch should start
 * ready to type.
 */
let hidden = false;
const listeners = new Set<() => void>();

const emit = () => {
	for (const listener of listeners) {
		listener();
	}
};

export function hideKeypad() {
	if (!hidden) {
		hidden = true;
		emit();
	}
}

/**
 * Called by every field the keypad can be aimed at: with the keypad down, the
 * tap that picks a target is also the tap that asks for it back. No-ops when it
 * is already up, so aiming at a field never costs a render.
 */
export function showKeypad() {
	if (hidden) {
		hidden = false;
		emit();
	}
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

const getSnapshot = () => hidden;

/** Third argument is the server snapshot, as in [[guides]]. */
export const useKeypadHidden = () =>
	useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
