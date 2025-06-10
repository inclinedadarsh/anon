"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

interface UserProfile {
	id: number;
	username: string | null;
	is_wait_listed: boolean;
	tags: string[] | null;
	bio: string | null;
	avatar_seed: string | null;
}

interface AuthContextType {
	user: UserProfile | null;
	isLoading: boolean;
	error: string | null;
	logout: () => Promise<void>;
	refetchUser: () => Promise<void>;
}

type AuthProviderProps = {
	children: React.ReactNode;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	const checkUser = useCallback(
		async (isRefetch = false) => {
			if (!backendUrl) {
				setError("Backend url not configured");
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const response = await fetch(`${backendUrl}/users/me`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
				});

				if (response.status === 401 || response.status === 403) {
					setUser(null);
					setError("User not authenticated.");
				} else if (!response.ok) {
					const responseData = await response
						.json()
						.catch(() => ({}));
					throw new Error(
						responseData.detail || `Error: ${responseData.statsu}`,
					);
				} else {
					const userData: UserProfile = await response.json();
					setUser(userData);
				}
			} catch (err: unknown) {
				console.error("Auth check failed: ", err);
				setUser(null);
				const message =
					err instanceof Error
						? err.message
						: "Could not check auth status.";
				setError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[backendUrl],
	);

	useEffect(() => {
		checkUser();
	}, [checkUser]);

	const logout = async () => {
		if (!backendUrl) {
			console.error("Backend url is not configured.");
			return;
		}
		try {
			const response = await fetch(`${backendUrl}/auth/logout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
		} catch (error) {
			console.error("Error calling backend logout: ", error);
		} finally {
			setUser(null);
			router.push("/");
			setIsLoading(false);
		}
	};

	const refetchUser = useCallback(async () => {
		console.log("authcontext refetch user has been called");
		await checkUser(true);
	}, [checkUser]);

	return (
		<AuthContext.Provider
			value={{ user, isLoading, error, logout, refetchUser }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
