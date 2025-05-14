"use client";

import { PageLayout } from "@/components/layouts/PageLayout";
import { ProtectedRoute } from "@/components/ui/ProtectedRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import PostItem, { type FetchedPost } from "./PostItem";

interface UserProfile {
	id: number;
	username: string | null;
	is_wait_listed: boolean;
	tags: string[] | null;
}

interface NewPost {
	content: string;
}

interface PostAuthor {
	author_id: string;
	username: string;
}

export default function HomePage() {
	const [postContent, setPostContent] = useState("");
	const { user, logout } = useAuth();
	const [isPosting, setIsPosting] = useState(false);
	const [errorPost, setErrorPost] = useState<string | null>(null);
	const [posts, setPosts] = useState<FetchedPost[]>([]);
	const [isLoadingPosts, setIsLoadingPosts] = useState(true);
	const [errorLodingPosts, setErrorLoadingPosts] = useState<string | null>(
		null,
	);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const router = useRouter();
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
	const { toast } = useToast();

	useEffect(() => {
		if (user && !user.username) {
			console.log("Username not set. Redirecting to profile setup page.");
			router.replace("/profile-setup");
		}
	}, [user, router]);

	const fetchPosts = async () => {
		if (!user || !user.username || !backendUrl) {
			setIsLoadingPosts(false);
			return;
		}
		setIsLoadingPosts(true);
		setErrorLoadingPosts(null);
		try {
			const response = await fetch(`${backendUrl}/posts/`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});

			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					console.error("Auth error fetching posts. logging out.");
					await handleLogout();
					return;
				}
				const responseData = await response.json().catch(() => ({}));
				throw new Error(
					responseData.detail || `Error ${response.status}`,
				);
			}

			const postData: FetchedPost[] = await response.json();
			setPosts(postData);
		} catch (error: unknown) {
			console.error("failed to fetch posts: ", error);
			const message =
				error instanceof Error ? error.message : "could not load posts";
			setErrorLoadingPosts(message);
		} finally {
			setIsLoadingPosts(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		// biome-ignore lint/complexity/useOptionalChain: <explanation>
		if (user && user.username) {
			fetchPosts();
		} else {
			setPosts([]);
			setIsLoadingPosts(false);
		}
	}, [user]);

	const handlePostSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!postContent.trim() || !user || !user.username) {
			if (!postContent.trim()) {
				setErrorPost("Post content cannot be empty.");
			} else {
				setErrorPost(
					"Sorry you cannot post. Either not logged in or profile not setup.",
				);
			}
			return;
		}
		setIsPosting(true);
		setErrorPost(null);
		if (!backendUrl) {
			setErrorPost("Backend URL is not set.");
			setIsPosting(false);
			return;
		}
		try {
			const response = await fetch(`${backendUrl}/posts/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({ content: postContent } as NewPost),
			});

			const responseData = await response.json();

			if (!response.ok) {
				if (response.status === 401 || response.status === 403) {
					setErrorPost("Authentication error. Please log in again.");
					await handleLogout();
					return;
				}
				const errorMessage =
					responseData.detail || `Error ${response.status}`;
				throw new Error(errorMessage);
			}

			toast({
				title: "Success!",
				description: "Your post has been submitted.",
			});
			setPostContent("");
			console.log("new post created:", responseData);
			fetchPosts();
			console.log("fetched new posts...");
		} catch (error: unknown) {
			console.log("failed to create post: ", error);
			const message =
				error instanceof Error
					? error.message
					: "Could not submit post.";
			setErrorPost(message);
			toast({
				title: "Post Error",
				description: message,
				variant: "destructive",
			});
		} finally {
			setIsPosting(false);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		await logout();
	};

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
				hour12: true,
			});
		} catch (error) {
			return "invalid date";
		}
	};

	const getInitials = (name: string | null | undefined): string => {
		return name?.charAt(0).toUpperCase() || "?";
	};

	if (user && !user.username) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center p-24">
				<p>Redirecting to profile setup page...</p>
			</main>
		);
	}

	return (
		<ProtectedRoute>
			<PageLayout
				username={user?.username}
				onLogout={handleLogout}
				isLoggingOut={isLoggingOut}
				getInitials={getInitials}
			>
				<h1 className="text-3xl font-bold">
					Supp, {user?.username}. Been a minute.
				</h1>

				<form onSubmit={handlePostSubmit} className="space-y-3">
					<Textarea
						placeholder="What's on your mind? Share anonymously..."
						value={postContent}
						onChange={event =>
							setPostContent(event.target.value.slice(0, 420))
						}
						required
						rows={4}
						disabled={isPosting}
						className="resize-none focus-visible:ring-0"
						maxLength={420}
					/>
					<div className="flex items-center">
						<div className="flex-1">
							{postContent.length > 0 && (
								<p className="text-sm text-muted-foreground">
									{420 - postContent.length} characters
									remaining
								</p>
							)}
						</div>
						<Button
							type="submit"
							disabled={isPosting || !postContent.trim()}
						>
							{isPosting ? "Posting..." : "Post Anonymously"}
						</Button>
					</div>
					{errorPost && (
						<p className="text-sm text-destructive">{errorPost}</p>
					)}
				</form>

				<div className="pt-8 space-y-4">
					{isLoadingPosts && <p>Loading posts...</p>}

					{errorLodingPosts && (
						<p className="text-destructive">
							Error loading posts: {errorLodingPosts}
						</p>
					)}

					{!isLoadingPosts &&
						!errorLodingPosts &&
						posts.map(post => (
							<PostItem
								key={post.id}
								post={post}
								getInitials={getInitials}
								formatDate={formatDate}
							/>
						))}
				</div>
			</PageLayout>
		</ProtectedRoute>
	);
}
