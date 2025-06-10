"use client";
import {
	Avatar,
	AvatarFallback,
	getDiceBearAvatarUrl,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

function randomSeed() {
	return Math.random().toString(36).substring(2, 12);
}

export default function ProfileSetupPage() {
	const [username, setUsername] = useState("");
	const [bio, setBio] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [avatarSeed, setAvatarSeed] = useState<string>("");
	const router = useRouter();
	const { toast } = useToast();
	const {
		refetchUser,
		user: currentUser,
		isLoading: isAuthLoading,
	} = useAuth();

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	useEffect(() => {
		if (!isAuthLoading && currentUser !== undefined) {
			if (!currentUser) {
				console.log(
					"Profile setup: not logged in, redirecting to login page",
				);
				router.replace("/");
			} else if (currentUser.username) {
				console.log(
					"profile setup: username is already set. redirecting to home page",
				);
				router.replace("/home");
			}
		}
	}, [currentUser, isAuthLoading, router]);

	useEffect(() => {
		setAvatarSeed(randomSeed());
	}, []);

	const handleRegenerateAvatar = () => {
		setAvatarSeed(randomSeed());
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);

		if (!backendUrl) {
			setError("Backend URL not configured.");
			setIsLoading(false);
			return;
		}

		try {
			const usernameResponse = await fetch(
				`${backendUrl}/users/me/username`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						username: username,
						avatar_seed: avatarSeed,
					}),
				},
			);

			if (!usernameResponse.ok) {
				const responseData = await usernameResponse.json();
				const errorMessage =
					responseData.detail ||
					`Error ${usernameResponse.status}: ${usernameResponse.statusText}`;
				throw new Error(errorMessage);
			}

			if (bio.trim()) {
				const bioResponse = await fetch(`${backendUrl}/users/me/bio`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({ bio: bio.trim() }),
				});

				if (!bioResponse.ok) {
					throw new Error("Failed to set bio");
				}
			}

			await refetchUser();
			toast({
				title: "Success!",
				description: "Your Anon profile is ready.",
			});

			router.push("/home");
		} catch (err: unknown) {
			console.log("Failed to set profile: ", err);
			const message =
				err instanceof Error
					? err.message
					: "An unknown error occurred.";
			setError(message);
			toast({
				variant: "destructive",
				title: "Something went wrong.",
				description: message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (isAuthLoading || !currentUser || currentUser.username) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center p-24">
				<p>Loading...</p>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
			<Toaster />
			<div className="w-full max-w-md space-y-6">
				<div className="text-center">
					<h1 className="text-3xl font-bold">
						Set Up Your Anonymous Profile
					</h1>
					<p className="mt-2 text-muted-foreground">
						Choose your unique username and add a bio to get
						started.
					</p>
				</div>
				<div className="flex flex-col items-center gap-2">
					<Avatar seed={avatarSeed} className="h-20 w-20">
						<AvatarFallback>
							{username ? username.charAt(0).toUpperCase() : "?"}
						</AvatarFallback>
					</Avatar>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleRegenerateAvatar}
						disabled={isLoading}
					>
						Regenerate Avatar
					</Button>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							type="text"
							value={username}
							onChange={e => setUsername(e.target.value)}
							placeholder="e.g anon_kkw"
							required
							minLength={4}
							maxLength={15}
							pattern="^[a-zA-Z0-9_]+$"
							disabled={isLoading}
							className="mt-1"
						/>
						<p className="text-xs mt-1 text-muted-foreground">
							4-15 characters, only letters, numbers and
							underscores allowed.
						</p>
					</div>
					<div>
						<Label htmlFor="bio">Bio (Optional)</Label>
						<Textarea
							id="bio"
							value={bio}
							onChange={e => setBio(e.target.value)}
							placeholder="Write something about yourself..."
							maxLength={140}
							disabled={isLoading}
							className="mt-1 resize-none"
						/>
						<p className="text-xs mt-1 text-muted-foreground">
							{140 - bio.length} characters remaining
						</p>
					</div>
					{error && (
						<p className="text-sm font-medium text-destructive">
							{error}
						</p>
					)}
					<Button
						className="w-full"
						type="submit"
						disabled={isLoading}
					>
						{isLoading ? "Saving..." : "Set Profile and Enter Anon"}
					</Button>
				</form>
			</div>
		</main>
	);
}
