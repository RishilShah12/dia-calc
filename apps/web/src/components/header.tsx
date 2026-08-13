"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();
	if (pathname === "/") {
		return null;
	}

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-4 py-2">
				<Link
					className="font-semibold text-sm uppercase tracking-[0.2em]"
					href="/"
				>
					DiaCalc
				</Link>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
