export type KeypadTarget = "carat" | "discount" | "net" | "rough" | "total";

export const DIGIT_ROWS = [
	["7", "8", "9"],
	["4", "5", "6"],
	["1", "2", "3"],
] as const;

/** Abbreviated hard: three segments share half the keypad's width. */
export const KEYPAD_TARGETS: { title: string; value: KeypadTarget }[] = [
	{ title: "CT", value: "carat" },
	{ title: "$/CT", value: "net" },
	{ title: "TOTAL", value: "total" },
];

const MAX_DECIMALS: Record<KeypadTarget, number> = {
	carat: 2,
	discount: 2,
	net: 0,
	/** A rough is weighed like a polished stone, to the hundredth. */
	rough: 2,
	total: 0,
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
