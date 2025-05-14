import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface PageLayoutProps {
	children: ReactNode;
	username?: string | null;
	onLogout?: () => Promise<void>;
	isLoggingOut?: boolean;
	showBackButton?: boolean;
	getInitials: (name: string | null | undefined) => string;
}

export function PageLayout({
	children,
	username,
	onLogout,
	isLoggingOut,
	showBackButton = false,
	getInitials,
}: PageLayoutProps) {
	const router = useRouter();

	return (
		<main className="flex min-h-screen flex-col p-4 pt-4 md:p-8 md:pt-8 items-center">
			<div className="w-full max-w-4xl flex justify-between items-center mb-8">
				{showBackButton ? (
					<Button
						variant="ghost"
						className="flex items-center space-x-2 p-2"
						onClick={() => router.push("/home")}
					>
						<ArrowLeft className="h-4 w-4" />
						<span>Back to Home</span>
					</Button>
				) : (
					<div className="flex items-center space-x-4">
						{username && (
							<Link href={`/${username}`}>
								<Button
									variant="ghost"
									className="flex items-center space-x-2 p-2"
								>
									<Avatar className="h-8 w-8">
										<AvatarFallback>
											{getInitials(username)}
										</AvatarFallback>
									</Avatar>
									<span className="font-medium">
										{username}
									</span>
								</Button>
							</Link>
						)}
					</div>
				)}
				{onLogout && (
					<div className="flex items-center space-x-4">
						<Button
							variant="ghost"
							onClick={onLogout}
							disabled={isLoggingOut}
							className="flex items-center space-x-2 p-2"
						>
							<LogOut className="h-5 w-5" />
							<span className="font-medium">
								{isLoggingOut ? "Logging out.." : "Logout"}
							</span>
						</Button>
					</div>
				)}
			</div>
			<div className="w-full max-w-4xl space-y-4">{children}</div>
		</main>
	);
}
