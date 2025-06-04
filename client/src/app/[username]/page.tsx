"use client";

import ReferralCard from "@/components/ReferralCard";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import UserTags from "@/components/ui/user-tags";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";
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
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPosts, setTotalPosts] = useState(0);
	const postsPerPage = 10;
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
				const offset = (currentPage - 1) * postsPerPage;
				const res = await fetch(
					`${backendUrl}/posts/user/${username}?limit=${postsPerPage}&offset=${offset}`,
					{
						credentials: "include",
					},
				);
				if (!res.ok) {
					throw new Error("Could not fetch user's posts");
				}
				const data = await res.json();
				setPosts(data.items);
				setTotalPosts(data.total);
			} catch (err: unknown) {
				setErrorPosts(
					err instanceof Error ? err.message : "Failed to load posts",
				);
			} finally {
				setLoadingPosts(false);
			}
		};
		fetchUserPosts();
	}, [username, backendUrl, currentUser, currentPage]);

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
					<div className="flex flex-col md:flex-row md:items-center md:gap-3 w-full">
						<h2 className="text-2xl font-bold">
							@{profile.username}
						</h2>
						<div className="hidden md:block">
							<UserTags tags={profile.tags || []} />
						</div>
					</div>
					{profile.bio && !isEditingBio && (
						<p className="text-muted-foreground mt-2">
							{profile.bio}
						</p>
					)}
					<div className="block md:hidden mt-2">
						<UserTags tags={profile.tags || []} />
					</div>
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
							<div className="flex justify-between items-center mt-2">
								<p className="text-sm text-muted-foreground">
									{140 - newBio.length} characters remaining
								</p>
								<div className="flex space-x-2">
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
											isSavingBio ||
											newBio === profile.bio
										}
									>
										{isSavingBio ? "Saving..." : "Save"}
									</Button>
								</div>
							</div>
						</form>
					)}
				</CardContent>
			</Card>

			{currentUser?.username === profile.username && (
				<div className="mb-6">
					<ReferralCard />
				</div>
			)}

			<section className="w-full">
				{loadingPosts && (
					<p className="text-center">Loading posts...</p>
				)}
				{errorPosts && (
					<p className="text-center text-destructive">{errorPosts}</p>
				)}
				{!loadingPosts &&
					!errorPosts &&
					posts &&
					posts.length === 0 && (
						<p className="text-center text-muted-foreground">
							No posts yet.
						</p>
					)}
				{!loadingPosts && !errorPosts && posts && posts.length > 0 && (
					<>
						<div className="space-y-4">
							{posts.map(post => (
								<PostItem
									key={post.id}
									post={post}
									getInitials={getInitials}
									formatDate={date =>
										new Date(date).toLocaleString(
											undefined,
											{
												dateStyle: "medium",
												timeStyle: "short",
												hour12: true,
											},
										)
									}
									onPostDeleted={() => {
										const fetchUserPosts = async () => {
											setLoadingPosts(true);
											setErrorPosts(null);
											try {
												const offset =
													(currentPage - 1) *
													postsPerPage;
												const res = await fetch(
													`${backendUrl}/posts/user/${username}?limit=${postsPerPage}&offset=${offset}`,
													{
														credentials: "include",
													},
												);
												if (!res.ok) {
													throw new Error(
														"Could not fetch user's posts",
													);
												}
												const data = await res.json();
												setPosts(data.items);
												setTotalPosts(data.total);
											} catch (err: unknown) {
												setErrorPosts(
													err instanceof Error
														? err.message
														: "Failed to load posts",
												);
											} finally {
												setLoadingPosts(false);
											}
										};
										fetchUserPosts();
									}}
								/>
							))}
						</div>
						{Math.ceil(totalPosts / postsPerPage) > 1 && (
							<div className="flex justify-center gap-2 mt-4">
								<Button
									variant="outline"
									onClick={() =>
										setCurrentPage(p => Math.max(1, p - 1))
									}
									disabled={currentPage === 1}
								>
									Previous
								</Button>
								<span className="flex items-center px-4">
									Page {currentPage} of{" "}
									{Math.ceil(totalPosts / postsPerPage)}
								</span>
								<Button
									variant="outline"
									onClick={() =>
										setCurrentPage(p =>
											Math.min(
												Math.ceil(
													totalPosts / postsPerPage,
												),
												p + 1,
											),
										)
									}
									disabled={
										currentPage ===
										Math.ceil(totalPosts / postsPerPage)
									}
								>
									Next
								</Button>
							</div>
						)}
					</>
				)}
			</section>
		</PageLayout>
	);
}
