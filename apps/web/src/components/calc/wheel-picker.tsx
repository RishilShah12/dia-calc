"use client";

import type { WheelOption } from "@dia-calc/calc/polish";
import { cn } from "@dia-calc/ui/lib/utils";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useRef,
} from "react";

/**
 * The rotor the grade wheels and the size bracket are picked on.
 *
 * Scroll-snap does natively what the native apps get from a SwiftUI `Picker` and
 * a hand-rolled Compose rotor: the list settles on a row, and whichever row it
 * settles on is the selection.
 */

const ITEM_HEIGHT = 34;

interface Props {
	"aria-label": string;
	/** The caption above the wheel, or null when guides are off. */
	label?: string | null;
	onChange: (value: string) => void;
	options: WheelOption[];
	/**
	 * How many options show at once. Rough fits four blocks above the keypad
	 * where polish fits two, so it asks for a shorter wheel — the same knob the
	 * native rough screen turns, for the same reason.
	 */
	rows?: 3 | 5;
	value: string;
}

function WheelRow({
	id,
	onSelect,
	option,
	selected,
}: {
	id: string;
	onSelect: (value: string) => void;
	option: WheelOption;
	selected: boolean;
}) {
	const handleClick = useCallback(
		() => onSelect(option.value),
		[onSelect, option.value]
	);
	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				onSelect(option.value);
			}
		},
		[onSelect, option.value]
	);

	return (
		<div
			aria-selected={selected}
			className="flex cursor-pointer snap-center items-center justify-center"
			id={id}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			role="option"
			style={{ height: ITEM_HEIGHT }}
			tabIndex={-1}
		>
			<span
				className={cn(
					"rounded-full px-3 py-0.5 font-semibold text-sm tabular-nums transition-colors",
					selected
						? "bg-calc-accent text-calc-accent-foreground"
						: "text-calc-subtle"
				)}
			>
				{option.title}
			</span>
		</div>
	);
}

export default function WheelPicker({
	"aria-label": ariaLabel,
	label,
	onChange,
	options,
	rows = 5,
	value,
}: Props) {
	// Half the extra rows, so the first and last options can still reach the
	// middle of the window.
	const padHeight = Math.floor((rows - 1) / 2) * ITEM_HEIGHT;
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const selectedIndex = Math.max(
		0,
		options.findIndex((option) => option.value === value)
	);

	useEffect(() => {
		const node = scrollerRef.current;
		if (node === null) {
			return;
		}
		const top = selectedIndex * ITEM_HEIGHT;
		// Guard, or the scroll this triggers fires `handleScroll`, which commits
		// the same index straight back and pins the wheel where it started.
		if (Math.abs(node.scrollTop - top) < 2) {
			return;
		}
		node.scrollTo({ behavior: "instant", top });
	}, [selectedIndex]);

	const commitIndex = useCallback(
		(index: number) => {
			const clamped = Math.min(Math.max(index, 0), options.length - 1);
			const option = options[clamped];
			if (option && option.value !== value) {
				onChange(option.value);
			}
		},
		[onChange, options, value]
	);

	const handleScroll = useCallback(() => {
		const node = scrollerRef.current;
		if (node === null) {
			return;
		}
		commitIndex(Math.round(node.scrollTop / ITEM_HEIGHT));
	}, [commitIndex]);

	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === "ArrowUp") {
				event.preventDefault();
				commitIndex(selectedIndex - 1);
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				commitIndex(selectedIndex + 1);
			}
		},
		[commitIndex, selectedIndex]
	);

	const selectedOption = options[selectedIndex];
	const activeId = selectedOption
		? `${ariaLabel}-${selectedOption.value}`
		: undefined;

	return (
		<div className="flex w-full min-w-0 flex-col">
			{/* Dropped rather than blanked when guides are off, so the space goes
			    back to the cards instead of leaving a hole where the label was. */}
			{label ? (
				<p className="h-4 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
					{label}
				</p>
			) : null}
			<div className="relative" style={{ height: rows * ITEM_HEIGHT }}>
				<div
					aria-activedescendant={activeId}
					aria-label={ariaLabel}
					className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					onKeyDown={handleKeyDown}
					onScroll={handleScroll}
					ref={scrollerRef}
					role="listbox"
					tabIndex={0}
				>
					<div aria-hidden="true" style={{ height: padHeight }} />
					{options.map((option, index) => (
						<WheelRow
							id={`${ariaLabel}-${option.value}`}
							key={option.value}
							onSelect={onChange}
							option={option}
							selected={index === selectedIndex}
						/>
					))}
					<div aria-hidden="true" style={{ height: padHeight }} />
				</div>
			</div>
		</div>
	);
}
