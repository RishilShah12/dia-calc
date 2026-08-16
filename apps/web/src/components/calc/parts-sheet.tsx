"use client";

import { type RoughSummary, usd } from "@dia-calc/calc/rap-calc";
import {
	money,
	type Part,
	type PartQuote,
	partLabel,
	pct,
} from "@dia-calc/calc/rough";
import { findShape } from "@dia-calc/calc/shapes";
import { Button } from "@dia-calc/ui/components/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@dia-calc/ui/components/item";
import { Separator } from "@dia-calc/ui/components/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@dia-calc/ui/components/sheet";
import { cn } from "@dia-calc/ui/lib/utils";
import { Trash2 } from "lucide-react";
import { useCallback } from "react";

/**
 * Every planned part side by side, which the main screen cannot show — the
 * wheels and the slider only ever address one of them.
 */

function SummaryLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-[11px] text-muted-foreground uppercase tracking-widest">
				{label}
			</span>
			<span className="font-semibold text-sm tabular-nums">{value}</span>
		</div>
	);
}

function PartRow({
	active,
	deletable,
	index,
	onDelete,
	onSelect,
	part,
	partQuote,
}: {
	active: boolean;
	deletable: boolean;
	index: number;
	onDelete: (index: number) => void;
	onSelect: (index: number) => void;
	part: Part;
	partQuote: PartQuote;
}) {
	const handleSelect = useCallback(() => onSelect(index), [index, onSelect]);
	const handleDelete = useCallback(() => onDelete(index), [index, onDelete]);
	const grade = `${findShape(part.shapeName).abbr} ${part.color.toUpperCase()} ${part.clarity.toUpperCase()}`;

	return (
		<Item>
			<ItemMedia>
				<span
					className={cn(
						"font-bold text-lg tabular-nums",
						active ? "text-calc-accent" : "text-muted-foreground"
					)}
				>
					{partLabel(index)}
				</span>
			</ItemMedia>
			<ItemContent onClick={handleSelect}>
				<ItemTitle className="tabular-nums">
					{`${partQuote.carat.toFixed(2)} ct`}
				</ItemTitle>
				<ItemDescription className="text-calc-subtle">{grade}</ItemDescription>
			</ItemContent>
			<ItemContent className="items-end text-right">
				<ItemTitle className="text-calc-accent tabular-nums">
					{money(partQuote.total, partQuote.priced)}
				</ItemTitle>
				<ItemDescription className="text-calc-subtle tabular-nums">
					{pct(partQuote.backPct, partQuote.priced)}
				</ItemDescription>
			</ItemContent>
			<ItemActions>
				{/* The last part cannot go: a rough with no parts has nothing to
				    price. */}
				{deletable ? (
					<Button
						aria-label={`Delete part ${partLabel(index)}`}
						onClick={handleDelete}
						size="icon"
						variant="ghost"
					>
						<Trash2 className="text-destructive" />
					</Button>
				) : null}
			</ItemActions>
		</Item>
	);
}

export default function PartsSheet({
	activeIndex,
	onDelete,
	onOpenChange,
	onSelect,
	open,
	parts,
	quotes,
	roughText,
	summary,
}: {
	activeIndex: number;
	onDelete: (index: number) => void;
	onOpenChange: (open: boolean) => void;
	onSelect: (index: number) => void;
	open: boolean;
	parts: Part[];
	quotes: PartQuote[];
	roughText: string;
	summary: RoughSummary;
}) {
	const deletable = parts.length > 1;

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className="mx-auto max-h-[85svh] max-w-md overflow-y-auto"
				side="bottom"
			>
				<SheetHeader>
					<SheetTitle>Parts</SheetTitle>
					<SheetDescription>
						Everything planned out of this rough.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col px-2">
					{parts.map((part, index) => {
						const partQuote = quotes[index];
						if (!partQuote) {
							return null;
						}
						return (
							<PartRow
								active={index === activeIndex}
								deletable={deletable}
								index={index}
								key={partLabel(index)}
								onDelete={onDelete}
								onSelect={onSelect}
								part={part}
								partQuote={partQuote}
							/>
						);
					})}
				</div>

				<div className="flex flex-col gap-2 px-4 pb-4">
					<Separator />
					<SummaryLine label="Rough" value={`${roughText || "0"} ct`} />
					<SummaryLine
						label="Parts"
						value={`${summary.partsCarat.toFixed(2)} ct`}
					/>
					<SummaryLine label="All parts" value={usd(summary.total)} />
					<SummaryLine label="Value / ct" value={usd(summary.perCarat, true)} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
