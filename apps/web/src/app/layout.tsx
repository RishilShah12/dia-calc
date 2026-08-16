import type { Metadata } from "next";
import { Nunito } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

/**
 * Nunito is the face the Android app bundles to stand in for SF Rounded, so the
 * web app is set in literally the same type rather than an approximation of it.
 */
const nunito = Nunito({
	subsets: ["latin"],
	variable: "--font-nunito",
});

export const metadata: Metadata = {
	description: "Rapaport pricing for polished and rough diamonds",
	title: "EZCalc",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${nunito.variable} antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
