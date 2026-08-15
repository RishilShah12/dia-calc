import { CalcToolbar } from "@/components/calc-toolbar";
import { RoughCalculator } from "@/components/rough-calculator";

/** The auth gate and the header live in the shared `(polish,rough)` layout. */
export default function Rough() {
	return (
		<>
			<RoughCalculator />
			<CalcToolbar />
		</>
	);
}
