export type KeypadTarget = "carat" | "discount" | "net";

const MAX_DECIMALS: Record<KeypadTarget, number> = {
	carat: 2,
	discount: 2,
	net: 0,
};

export const maxDecimalsFor = (target: KeypadTarget): number =>
	MAX_DECIMALS[target];

const isNegative = (value: string) => value.startsWith("-");

const unsignedPart = (value: string) =>
	isNegative(value) ? value.slice(1) : value;

const withSign = (unsigned: string, negative: boolean) =>
	negative && unsigned.length > 0 ? `-${unsigned}` : unsigned;

export function keypadDigit(
	current: string,
	digit: string,
	maxDecimals: number
): string {
	const negative = isNegative(current);
	const unsigned = unsignedPart(current);

	if (unsigned === "" || unsigned === "0") {
		return withSign(digit, negative);
	}

	const dot = unsigned.indexOf(".");
	if (dot >= 0 && unsigned.length - dot - 1 >= maxDecimals) {
		return current;
	}

	return withSign(`${unsigned}${digit}`, negative);
}

export function keypadDot(current: string, maxDecimals: number): string {
	if (maxDecimals <= 0) {
		return current;
	}

	const unsigned = unsignedPart(current);
	if (unsigned.includes(".")) {
		return current;
	}

	if (unsigned === "") {
		return isNegative(current) ? "-0." : "0.";
	}

	return `${current}.`;
}

export function keypadBackspace(current: string): string {
	if (current.length <= 1 || current === "-") {
		return "";
	}

	const next = current.slice(0, -1);
	return next === "-" ? "" : next;
}

export function keypadSign(current: string): string {
	if (current === "" || current === "0" || current === "0.") {
		return current.startsWith("-") ? current.slice(1) : `-${current || "0"}`;
	}

	return current.startsWith("-") ? current.slice(1) : `-${current}`;
}

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
