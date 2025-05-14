"use client";

import { PageLayout } from "@/components/layouts/PageLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PostItem, { type FetchedPost } from "../home/PostItem";

interface UserProfile {
	id: number;
	username: string;
	is_wait_listed: boolean;
	tags: string[] | null;
	bio: string | null;
}

export default function ProfilePage() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();
	const { user: currentUser, refetchUser } = useAuth();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
	const [posts, setPosts] = useState<FetchedPost[]>([]);
	const [loadingPosts, setLoadingPosts] = useState(true);
	const [errorPosts, setErrorPosts] = useState<string | null>(null);
	const [isEditingBio, setIsEditingBio] = useState(false);
	const [newBio, setNewBio] = useState("");
	const [isSavingBio, setIsSavingBio] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (!username) return;
		if (currentUser && currentUser.username === username) {
			setProfile({
				id: currentUser.id,
				username: currentUser.username,
				is_wait_listed: currentUser.is_wait_listed,
				tags: currentUser.tags,
				bio: currentUser.bio || null,
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

	const handleBioSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!backendUrl) return;

		setIsSavingBio(true);
		try {
			const response = await fetch(`${backendUrl}/users/me/bio`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ bio: newBio }),
			});

			if (!response.ok) {
				throw new Error("Failed to update bio");
			}

			const updatedUser = await response.json();
			setProfile(prev =>
				prev ? { ...prev, bio: updatedUser.bio } : null,
			);
			await refetchUser();
			setIsEditingBio(false);
			toast({
				title: "Success",
				description: "Your bio has been updated",
			});
		} catch (err) {
			toast({
				title: "Error",
				description: "Failed to update bio",
				variant: "destructive",
			});
		} finally {
			setIsSavingBio(false);
		}
	};

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
		<PageLayout showBackButton getInitials={getInitials}>
			<Card className="w-full flex flex-row items-start p-4 border-none shadow-none relative">
				{currentUser?.username === profile.username &&
					!isEditingBio && (
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-2 right-2 h-8 w-8"
							onClick={() => {
								setNewBio(profile.bio || "");
								setIsEditingBio(true);
							}}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					)}
				<Avatar className="h-20 w-20">
					<AvatarFallback>
						{getInitials(profile.username)}
					</AvatarFallback>
				</Avatar>
				<CardContent className="flex flex-col items-start ml-4 pt-0">
					<h2 className="text-2xl font-bold">@{profile.username}</h2>
					{profile.bio && !isEditingBio && (
						<p className="text-muted-foreground mt-2">
							{profile.bio}
						</p>
					)}
					{isEditingBio && (
						<form
							onSubmit={handleBioSubmit}
							className="w-full max-w-md mt-2"
						>
							<Textarea
								value={newBio}
								onChange={e => setNewBio(e.target.value)}
								placeholder="Write something about yourself..."
								maxLength={140}
								className="resize-none"
							/>
							<div className="flex justify-end space-x-2 mt-2">
								<Button
									variant="ghost"
									onClick={() => setIsEditingBio(false)}
									disabled={isSavingBio}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={
										isSavingBio || newBio === profile.bio
									}
								>
									{isSavingBio ? "Saving..." : "Save"}
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>

			<section className="w-full">
				{loadingPosts && (
					<p className="text-center">Loading posts...</p>
				)}
				{errorPosts && (
					<p className="text-center text-destructive">{errorPosts}</p>
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
		</PageLayout>
	);
}
