import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Anon for K. K. Wagh",
	description: "Fully anonymous social media platform for K. K. Wagh",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
			<body className={`${inter.className} antialiased`}>
				<AuthProvider>
					{children}
					<Toaster />
				</AuthProvider>
			</body>
		</html>
	);
}
