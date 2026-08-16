import RapList from "@/components/calc/rap-list";

/**
 * The one screen that takes the full width. Whole prices across every clarity
 * need more room than a phone has — that is why the native table has to scroll
 * both ways — so where there is room, it uses it.
 */
export default function RapPage() {
	return (
		<div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
			<RapList />
		</div>
	);
}
