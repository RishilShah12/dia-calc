import PolishCalculator from "@/components/calc/polish-calculator";

/**
 * The polish calculator is the product, so it owns `/`.
 *
 * Held to a phone's width even on a desktop: the layout is a thumb's layout —
 * a keypad under a card — and stretching it to 1400px would only put more
 * distance between the number and the key that changes it.
 */
export default function PolishPage() {
	return (
		<div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
			<PolishCalculator />
		</div>
	);
}
