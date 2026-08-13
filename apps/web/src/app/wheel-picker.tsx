"use client";

import { cn } from "@dia-calc/ui/lib/utils";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useRef,
} from "react";

const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const PAD_HEIGHT = Math.floor((VISIBLE_COUNT - 1) / 2) * ITEM_HEIGHT;

export interface WheelItem {
	label: string;
	value: string;
}

interface Props {
	"aria-label": string;
	items: WheelItem[];
	onChange: (value: string) => void;
	value: string;
}

function WheelOption({
	id,
	label,
	onSelect,
	selected,
	value,
}: {
	id: string;
	label: string;
	onSelect: (value: string) => void;
	selected: boolean;
	value: string;
}) {
	const handleClick = useCallback(() => onSelect(value), [onSelect, value]);
	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				onSelect(value);
			}
		},
		[onSelect, value]
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
					"rounded-calc px-3 py-1 font-semibold text-sm tabular-nums",
					selected
						? "bg-calc-accent text-calc-accent-foreground"
						: "text-muted-foreground"
				)}
			>
				{label}
			</span>
		</div>
	);
}

export default function WheelPicker({
	"aria-label": ariaLabel,
	items,
	onChange,
	value,
}: Props) {
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const selectedIndex = Math.max(
		0,
		items.findIndex((item) => item.value === value)
	);

	useEffect(() => {
		const node = scrollerRef.current;
		if (node === null) {
			return;
		}
		const top = selectedIndex * ITEM_HEIGHT;
		if (Math.abs(node.scrollTop - top) < 2) {
			return;
		}
		node.scrollTo({ behavior: "instant", top });
	}, [selectedIndex]);

	const commitIndex = useCallback(
		(index: number) => {
			const clamped = Math.min(Math.max(index, 0), items.length - 1);
			const item = items[clamped];
			if (item && item.value !== value) {
				onChange(item.value);
			}
		},
		[items, onChange, value]
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

	const activeId = items[selectedIndex]
		? `${ariaLabel}-${items[selectedIndex].value}`
		: undefined;

	return (
		<div className="flex w-full flex-col">
			<p className="pb-1 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
				{ariaLabel}
			</p>
			<div className="relative" style={{ height: VISIBLE_COUNT * ITEM_HEIGHT }}>
				<div
					aria-activedescendant={activeId}
					aria-label={ariaLabel}
					className="scrollbar-none scroll-fade h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					onKeyDown={handleKeyDown}
					onScroll={handleScroll}
					ref={scrollerRef}
					role="listbox"
					tabIndex={0}
				>
					<div aria-hidden="true" style={{ height: PAD_HEIGHT }} />
					{items.map((item, index) => (
						<WheelOption
							id={`${ariaLabel}-${item.value}`}
							key={item.value}
							label={item.label}
							onSelect={onChange}
							selected={index === selectedIndex}
							value={item.value}
						/>
					))}
					<div aria-hidden="true" style={{ height: PAD_HEIGHT }} />
				</div>
			</div>
		</div>
	);
}
