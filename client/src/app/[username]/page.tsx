"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PostItem, { type FetchedPost } from "../home/PostItem";

interface UserProfile {
	id: number;
	username: string;
	is_wait_listed: boolean;
	tags: string[] | null;
}

export default function ProfilePage() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();
	const { user: currentUser } = useAuth();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
	const [posts, setPosts] = useState<FetchedPost[]>([]);
	const [loadingPosts, setLoadingPosts] = useState(true);
	const [errorPosts, setErrorPosts] = useState<string | null>(null);

	useEffect(() => {
		if (!username) return;
		if (currentUser && currentUser.username === username) {
			setProfile({
				id: currentUser.id,
				username: currentUser.username,
				is_wait_listed: currentUser.is_wait_listed,
				tags: currentUser.tags,
			});
			setLoading(false);
		} else {
			const fetchProfile = async () => {
				setLoading(true);
				setError(null);
				try {
					const res = await fetch(
						`${backendUrl}/users/user/${username}`,
					);
					if (!res.ok) {
						throw new Error("User not found");
					}
					const data = await res.json();
					setProfile(data);
				} catch (err: unknown) {
					if (err instanceof Error) {
						setError(err.message);
					} else {
						setError("Failed to load profile");
					}
				} finally {
					setLoading(false);
				}
			};
			fetchProfile();
		}
		const fetchUserPosts = async () => {
			setLoadingPosts(true);
			setErrorPosts(null);
			try {
				const res = await fetch(
					`${backendUrl}/posts/user/${username}`,
					{
						credentials: "include",
					},
				);
				if (!res.ok) {
					throw new Error("Could not fetch user's posts");
				}
				const data = await res.json();
				setPosts(data);
			} catch (err: unknown) {
				setErrorPosts(
					err instanceof Error ? err.message : "Failed to load posts",
				);
			} finally {
				setLoadingPosts(false);
			}
		};
		fetchUserPosts();
	}, [username, backendUrl, currentUser]);

	const getInitials = (name: string | null | undefined) =>
		name?.charAt(0).toUpperCase() || "?";

	if (loading)
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p>Loading...</p>
			</main>
		);
	if (error)
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p className="text-destructive">{error}</p>
			</main>
		);
	if (!profile) return null;

	return (
		<main className="flex min-h-screen flex-col p-6 pt-8 md:p-24 items-center">
			<div className="w-full max-w-4xl space-y-8">
				<div className="flex justify-between items-center">
					<Button
						variant="ghost"
						className="flex items-center space-x-2 p-2"
						onClick={() => router.push("/home")}
					>
						<ArrowLeft className="h-4 w-4" />
						<span>Back to Home</span>
					</Button>
				</div>

				<Card className="w-full flex flex-row items-center border-none shadow-none">
					<Avatar className="h-20 w-20 m-2">
						<AvatarFallback>
							{getInitials(profile.username)}
						</AvatarFallback>
					</Avatar>
					<CardContent className="flex flex-col items-center">
						<h2 className="text-2xl font-bold">
							@{profile.username}
						</h2>
					</CardContent>
				</Card>

				<section className="w-full">
					{loadingPosts && (
						<p className="text-center">Loading posts...</p>
					)}
					{errorPosts && (
						<p className="text-center text-destructive">
							{errorPosts}
						</p>
					)}
					{!loadingPosts && !errorPosts && posts.length === 0 && (
						<p className="text-center text-muted-foreground">
							No posts yet.
						</p>
					)}
					<div className="space-y-4">
						{posts.map(post => (
							<PostItem
								key={post.id}
								post={post}
								getInitials={getInitials}
								formatDate={date =>
									new Date(date).toLocaleString(undefined, {
										dateStyle: "medium",
										timeStyle: "short",
										hour12: true,
									})
								}
							/>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
