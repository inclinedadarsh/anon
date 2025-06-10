"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function GuestRoute({
	children,
}: { children: React.ReactNode }) {
	const { user, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && user) {
			router.replace("/home");
		}
	}, [user, isLoading, router]);

	if (isLoading) return null;

	return <>{!user && children}</>;
}
