import { CalcToolbar } from "@/components/calc-toolbar";
import { Calculator } from "@/components/calculator";

/** The auth gate and the header live in the shared `(polish,rough)` layout. */
export default function Polish() {
	return (
		<>
			<Calculator />
			<CalcToolbar />
		</>
	);
}
