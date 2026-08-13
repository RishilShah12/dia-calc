"use client";

import { Skeleton } from "@dia-calc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { fxQueryOptions } from "@/lib/fx";
import {
	dispatchPhysicalKey,
	type KeypadTarget,
	keypadBackspace,
	keypadDigit,
	keypadDot,
	keypadSign,
	maxDecimalsFor,
} from "@/lib/keypad";
import { type Clamp, formatBracket, lookupPrice, quote } from "@/lib/rap-calc";
import { findShape, type Shape } from "@/lib/shapes";
import { orpc, queryClient } from "@/utils/orpc";

import CalcHeader from "./calc-header";
import GradeWheels from "./grade-wheels";
import Keypad from "./keypad";
import SummaryCard from "./summary-card";

function clampNotice(clamped: Clamp, bracket: [number, number] | null) {
	if (!(clamped && bracket)) {
		return null;
	}
	const where = formatBracket(bracket);
	if (clamped === "above") {
		return `Above Rapaport's published range — priced off ${where}.`;
	}
	if (clamped === "below") {
		return `Below Rapaport's published range — priced off ${where}.`;
	}
	return `Rapaport publishes no list for this weight — priced off ${where}.`;
}

function quoteNotice(
	clamped: Clamp,
	bracket: [number, number] | null,
	shape: Shape
): string | null {
	const parts: string[] = [];
	if (shape.list !== "Round") {
		parts.push(
			"Fancy shapes share one Rap list — apply the shape adjustment in the back %."
		);
	}
	const clamp = clampNotice(clamped, bracket);
	if (clamp) {
		parts.push(clamp);
	}
	return parts.length > 0 ? parts.join(" ") : null;
}

export default function Calculator() {
	const priceList = useQuery(
		orpc.priceList.get.queryOptions({
			input: { force: false },
			staleTime: 60 * 60 * 1000,
		})
	);
	const fx = useQuery(fxQueryOptions);

	const refresh = useMutation({
		mutationFn: () => orpc.priceList.get.call({ force: true }),
		onSuccess: (grids) => {
			queryClient.setQueryData(
				orpc.priceList.get.queryOptions({ input: { force: false } }).queryKey,
				grids
			);
		},
	});

	const [shapeName, setShapeName] = useState("Round");
	const [caratText, setCaratText] = useState("1.00");
	const [color, setColor] = useState("g");
	const [clarity, setClarity] = useState("vs1");
	const [backText, setBackText] = useState("-25");
	const [netText, setNetText] = useState("");
	const [lastEdited, setLastEdited] = useState<"back" | "net">("back");
	const [rateText, setRateText] = useState("");
	const [keypadTarget, setKeypadTarget] = useState<KeypadTarget>("carat");

	const handleRefresh = useCallback(() => refresh.mutate(), [refresh]);
	const handleRate = useCallback((value: string) => setRateText(value), []);

	const shape = findShape(shapeName);
	const grid = priceList.data?.find((entry) => entry.shape === shape.list);

	useEffect(() => {
		if (!grid) {
			return;
		}
		if (!grid.colors.includes(color)) {
			const [next] = grid.colors;
			if (next) {
				setColor(next);
			}
		}
		if (!grid.clarities.includes(clarity)) {
			const [next] = grid.clarities;
			if (next) {
				setClarity(next);
			}
		}
	}, [grid, color, clarity]);

	const carat = Number.parseFloat(caratText) || 0;
	const found = grid
		? lookupPrice(grid, carat, color, clarity)
		: { bracket: null, bracketIndex: -1, clamped: null, perCarat: null };
	const list = found.perCarat ?? 0;

	const q = quote(
		list,
		carat,
		lastEdited === "back"
			? { backPct: Number.parseFloat(backText) || 0 }
			: { netPerCarat: Number.parseFloat(netText) || 0 }
	);

	const backValue = lastEdited === "back" ? backText : String(q.backPct);
	const netValue =
		lastEdited === "net" ? netText : (q.netPerCarat || 0).toFixed(0);

	const activeText = (() => {
		if (keypadTarget === "carat") {
			return caratText;
		}
		if (keypadTarget === "net") {
			return netValue;
		}
		return backValue;
	})();

	const applyToActive = useCallback(
		(next: string) => {
			if (keypadTarget === "carat") {
				setCaratText(next);
				return;
			}
			if (keypadTarget === "net") {
				setLastEdited("net");
				setNetText(next);
				return;
			}
			setLastEdited("back");
			setBackText(next);
		},
		[keypadTarget]
	);

	const handleDigit = useCallback(
		(digit: string) => {
			applyToActive(
				keypadDigit(activeText, digit, maxDecimalsFor(keypadTarget))
			);
		},
		[activeText, applyToActive, keypadTarget]
	);
	const handleDot = useCallback(() => {
		applyToActive(keypadDot(activeText, maxDecimalsFor(keypadTarget)));
	}, [activeText, applyToActive, keypadTarget]);
	const handleBackspace = useCallback(() => {
		applyToActive(keypadBackspace(activeText));
	}, [activeText, applyToActive]);
	const handleClear = useCallback(() => {
		applyToActive("");
	}, [applyToActive]);
	const handleSign = useCallback(() => {
		applyToActive(keypadSign(activeText));
	}, [activeText, applyToActive]);

	const handleSelectTarget = useCallback(
		(next: KeypadTarget) => {
			if (next !== keypadTarget) {
				if (next === "net") {
					setLastEdited("net");
					setNetText((q.netPerCarat || 0).toFixed(0));
				}
				if (next === "discount") {
					setLastEdited("back");
					setBackText(String(q.backPct));
				}
			}
			setKeypadTarget(next);
		},
		[keypadTarget, q.backPct, q.netPerCarat]
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const handled = dispatchPhysicalKey(event, {
				backspace: handleBackspace,
				clear: handleClear,
				digit: handleDigit,
				dot: handleDot,
				sign: handleSign,
			});
			if (handled) {
				event.preventDefault();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleBackspace, handleClear, handleDigit, handleDot, handleSign]);

	const header = (
		<CalcHeader
			listDate={grid?.date ?? null}
			onRateChange={handleRate}
			onRefresh={handleRefresh}
			placeholderRate={fx.data ? fx.data.inr.toFixed(2) : "—"}
			rateText={rateText}
			refreshing={refresh.isPending}
		/>
	);

	if (!grid) {
		return (
			<div className="flex h-full flex-col bg-calc-surface">
				{header}
				<div className="flex flex-col gap-3 p-4">
					{priceList.isPending ? (
						<>
							<Skeleton className="h-36 w-full rounded-calc" />
							<Skeleton className="h-48 w-full rounded-calc" />
							<Skeleton className="h-52 w-full rounded-calc" />
						</>
					) : (
						<p className="text-destructive text-sm">
							Could not load the Rapaport price list.
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col bg-calc-surface">
			{header}
			<SummaryCard
				backPct={q.backPct}
				caratText={caratText}
				listPerCarat={found.perCarat}
				netPerCarat={q.netPerCarat}
				notice={quoteNotice(found.clamped, found.bracket, shape)}
				onSelectTarget={handleSelectTarget}
				target={keypadTarget}
				total={q.total}
			/>
			<GradeWheels
				clarities={grid.clarities}
				clarity={clarity}
				color={color}
				colors={grid.colors}
				onClarity={setClarity}
				onColor={setColor}
				onShape={setShapeName}
				shapeName={shapeName}
			/>
			<Keypad
				onBackspace={handleBackspace}
				onClear={handleClear}
				onDigit={handleDigit}
				onDot={handleDot}
				onSign={handleSign}
			/>
		</div>
	);
}
