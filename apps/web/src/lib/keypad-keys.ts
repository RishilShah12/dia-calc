/**
 * Physical-keyboard dispatch is the one part of the keypad that needs the DOM,
 * so it stays in the web app rather than in the shared, platform-free
 * `@dia-calc/calc` package.
 */

export interface KeypadActions {
	backspace: () => void;
	clear: () => void;
	digit: (digit: string) => void;
	dot: () => void;
	sign: () => void;
}

const isEditableTarget = (target: EventTarget | null) =>
	target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

/** Returns true when the key was consumed so the caller can preventDefault. */
export function dispatchPhysicalKey(
	event: KeyboardEvent,
	actions: KeypadActions
): boolean {
	if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey) {
		return false;
	}

	if (event.key >= "0" && event.key <= "9") {
		actions.digit(event.key);
		return true;
	}

	switch (event.key) {
		case ".":
		case ",":
			actions.dot();
			return true;
		case "Backspace":
			actions.backspace();
			return true;
		case "Escape":
			actions.clear();
			return true;
		case "-":
		case "+":
		case "_":
			actions.sign();
			return true;
		default:
			if (event.key.toLowerCase() === "c") {
				actions.clear();
				return true;
			}
			return false;
	}
}
