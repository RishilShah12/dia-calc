"use client";

import {
	DIGIT_ROWS,
	KEYPAD_TARGETS,
	type KeypadTarget,
} from "@dia-calc/calc/keypad";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@dia-calc/ui/components/toggle-group";
import { cn } from "@dia-calc/ui/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

/**
 * The same four-by-four the native screens draw:
 *
 *     7 8 9 ⌫
 *     4 5 6 C
 *     1 2 3 {action}      RECUT on polish, ROUGH on rough
 *     . 0 [ CT | $/CT | TOTAL ]
 *
 * The fourth column is where the two calculators differ, so the action key comes
 * in as a node rather than a flag.
 */

const KEY_CLASS =
	"flex h-13 select-none items-center justify-center rounded-calc bg-calc-key font-semibold text-calc-key-foreground text-xl tabular-nums transition-transform active:translate-y-px";

export function KeypadKey({
	active,
	children,
	label,
	onPress,
}: {
	active?: boolean;
	children: ReactNode;
	label: string;
	onPress: () => void;
}) {
	return (
		<button
			aria-label={label}
			aria-pressed={active}
			className={cn(
				KEY_CLASS,
				"text-sm tracking-wider",
				active && "bg-calc-accent text-calc-accent-foreground"
			)}
			onClick={onPress}
			type="button"
		>
			{children}
		</button>
	);
}

function DigitKey({
	digit,
	onDigit,
}: {
	digit: string;
	onDigit: (digit: string) => void;
}) {
	const onPress = useCallback(() => onDigit(digit), [digit, onDigit]);
	return (
		<button
			aria-label={digit}
			className={KEY_CLASS}
			onClick={onPress}
			type="button"
		>
			{digit}
		</button>
	);
}

export default function Keypad({
	actionKey,
	onBackspace,
	onClear,
	onDigit,
	onDot,
	onSelectTarget,
	target,
}: {
	/** Row three, column four. See above. */
	actionKey: ReactNode;
	onBackspace: () => void;
	onClear: () => void;
	onDigit: (digit: string) => void;
	onDot: () => void;
	onSelectTarget: (next: KeypadTarget) => void;
	target: KeypadTarget;
}) {
	const [top, middle, bottom] = DIGIT_ROWS;
	// Base UI wants the pressed *set*; only one segment is ever in it.
	const pressed = useMemo(() => [target], [target]);

	const handleTarget = useCallback(
		(groupValue: string[]) => {
			// Base UI reports the pressed set, and pressing the active segment
			// empties it. The keypad always has a target, so an empty set means
			// "no change" rather than "nothing selected".
			const [next] = groupValue;
			if (next) {
				onSelectTarget(next as KeypadTarget);
			}
		},
		[onSelectTarget]
	);

	return (
		<div className="grid shrink-0 grid-cols-4 gap-2 px-3 pt-1 pb-3">
			{top.map((digit) => (
				<DigitKey digit={digit} key={digit} onDigit={onDigit} />
			))}
			<KeypadKey label="Backspace" onPress={onBackspace}>
				⌫
			</KeypadKey>

			{middle.map((digit) => (
				<DigitKey digit={digit} key={digit} onDigit={onDigit} />
			))}
			<KeypadKey label="Clear" onPress={onClear}>
				C
			</KeypadKey>

			{bottom.map((digit) => (
				<DigitKey digit={digit} key={digit} onDigit={onDigit} />
			))}
			{actionKey}

			<KeypadKey label="Decimal point" onPress={onDot}>
				.
			</KeypadKey>
			<DigitKey digit="0" onDigit={onDigit} />
			<ToggleGroup
				className="col-span-2 h-13 w-full rounded-calc bg-muted p-1"
				onValueChange={handleTarget}
				value={pressed}
			>
				{KEYPAD_TARGETS.map((option) => (
					<ToggleGroupItem
						className="h-full flex-1 rounded-calc font-semibold text-[11px] tracking-wider data-[pressed]:bg-calc-accent data-[pressed]:text-calc-accent-foreground"
						key={option.value}
						value={option.value}
					>
						{option.title}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
