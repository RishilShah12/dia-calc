import { CalcToolbar } from "@/components/calc-toolbar";
import { RapList } from "@/components/rap-list";

/** The auth gate and the header live in this group's own layout. */
export default function Rap() {
	return (
		<>
			<RapList />
			<CalcToolbar />
		</>
	);
}
