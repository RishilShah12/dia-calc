import RoughCalculator from "@/components/calc/rough-calculator";

/** Held to a phone's width for the same reason the polish screen is. */
export default function RoughPage() {
	return (
		<div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
			<RoughCalculator />
		</div>
	);
}
