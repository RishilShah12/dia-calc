"use client";

import { cn } from "@dia-calc/ui/lib/utils";
import { useCallback } from "react";

interface Props {
	onBackspace: () => void;
	onClear: () => void;
	onDigit: (digit: string) => void;
	onDot: () => void;
	onSign: () => void;
}

function KeyButton({
	ariaLabel,
	children,
	className,
	onPress,
}: {
	ariaLabel: string;
	children: string;
	className?: string;
	onPress: () => void;
}) {
	return (
		<button
			aria-label={ariaLabel}
			className={cn(
				"flex h-14 items-center justify-center rounded-calc font-semibold text-xl tabular-nums active:translate-y-px",
				className
			)}
			onClick={onPress}
			type="button"
		>
			{children}
		</button>
	);
}

function DigitKey({
	className,
	digit,
	onDigit,
}: {
	className?: string;
	digit: string;
	onDigit: (digit: string) => void;
}) {
	const onPress = useCallback(() => onDigit(digit), [digit, onDigit]);
	return (
		<KeyButton ariaLabel={digit} className={className} onPress={onPress}>
			{digit}
		</KeyButton>
	);
}

const KEY_CLASS = "bg-calc-key text-foreground";
const FN_CLASS = "bg-muted text-muted-foreground";

export default function Keypad({
	onBackspace,
	onClear,
	onDigit,
	onDot,
	onSign,
}: Props) {
	return (
		<div className="grid shrink-0 grid-cols-4 gap-2 px-3 pt-1 pb-3">
			<DigitKey className={KEY_CLASS} digit="7" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="8" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="9" onDigit={onDigit} />
			<KeyButton
				ariaLabel="Backspace"
				className={FN_CLASS}
				onPress={onBackspace}
			>
				{"<"}
			</KeyButton>
			<DigitKey className={KEY_CLASS} digit="4" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="5" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="6" onDigit={onDigit} />
			<KeyButton ariaLabel="Clear" className={FN_CLASS} onPress={onClear}>
				C
			</KeyButton>
			<DigitKey className={KEY_CLASS} digit="1" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="2" onDigit={onDigit} />
			<DigitKey className={KEY_CLASS} digit="3" onDigit={onDigit} />
			<KeyButton ariaLabel="Toggle sign" className={FN_CLASS} onPress={onSign}>
				±
			</KeyButton>
			<KeyButton ariaLabel="Decimal" className={FN_CLASS} onPress={onDot}>
				.
			</KeyButton>
			<DigitKey
				className={cn(KEY_CLASS, "col-span-3")}
				digit="0"
				onDigit={onDigit}
			/>
		</div>
	);
}
