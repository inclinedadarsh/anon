"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
	children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, isLoading, error } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && (!user || error)) {
			console.log("Not authenticated. redirecting to login page.");
			router.replace("/");
		}
	}, [user, isLoading, error, router]);

	if (isLoading) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center p-24">
				<p>Authenticating User...</p>
			</main>
		);
	}
	if (!user || error) {
		return null;
	}

	return <>{children}</>;
}
