import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PostAuthor {
	author_id: string | number;
	username: string;
	avatar_seed?: string | null;
}

export interface FetchedPost {
	id: number;
	content: string;
	created_at: string;
	author: PostAuthor;
	score: number;
	user_vote: number | null;
}

interface PostItemProps {
	post: FetchedPost;
	getInitials: (name: string | null | undefined) => string;
	formatDate: (dateString: string) => string;
	onPostDeleted?: () => void;
}

export default function PostItem({
	post,
	getInitials,
	formatDate,
	onPostDeleted,
}: PostItemProps) {
	const { user } = useAuth();
	const { toast } = useToast();
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	const [score, setScore] = useState(post.score);
	const [userVote, setUserVote] = useState(post.user_vote);
	const [isVoting, setIsVoting] = useState(false);

	const handleDelete = async () => {
		try {
			const response = await fetch(`${backendUrl}/posts/${post.id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to delete post");
			}

			toast({
				title: "Success",
				description: "Post deleted successfully",
			});

			if (onPostDeleted) {
				onPostDeleted();
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete post",
				variant: "destructive",
			});
		}
	};

	const handleVote = async (voteType: number) => {
		if (isVoting) return;

		setIsVoting(true);

		const oldScore = score;
		const oldUserVote = userVote;

		try {
			if (userVote === voteType) {
				const response = await fetch(
					`${backendUrl}/posts/${post.id}/vote`,
					{
						method: "DELETE",
						credentials: "include",
					},
				);

				if (!response.ok) throw new Error("Failed to remove vote");

				const data = await response.json();
				setScore(data.post.score);
				setUserVote(null);
			} else {
				const response = await fetch(
					`${backendUrl}/posts/${post.id}/vote`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ vote_type: voteType }),
					},
				);

				if (!response.ok) throw new Error("Failed to vote");

				const data = await response.json();
				setScore(data.post.score);
				setUserVote(voteType);
			}
		} catch (error) {
			setScore(oldScore);
			setUserVote(oldUserVote);

			toast({
				title: "Error",
				description: "Failed to vote on post",
				variant: "destructive",
			});
		} finally {
			setIsVoting(false);
		}
	};

	const isAuthor = user?.username === post.author.username;

	return (
		<Card
			key={post.id}
			className="border-none rounded-none shadow-none border-b border-gray-200 pb-4"
		>
			<CardHeader className="p-0 pb-2">
				<div className="flex items-start space-x-3">
					<Link
						href={`/${post.author.username}`}
						className="flex-shrink-0"
					>
						<Avatar
							seed={post.author.avatar_seed || undefined}
							className="h-10 w-10 cursor-pointer"
						>
							<AvatarFallback>
								{getInitials(post.author.username)}
							</AvatarFallback>
						</Avatar>
					</Link>
					<div className="flex flex-col min-w-0 flex-1">
						<div className="flex items-center justify-between w-full">
							<Link
								href={`/${post.author.username}`}
								className="hover:underline"
							>
								<CardTitle className="text-sm font-medium cursor-pointer">
									{post.author.username}
								</CardTitle>
							</Link>
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground flex-shrink-0">
									{formatDate(post.created_at)}
								</span>
								{isAuthor && (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-destructive"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													Delete Post
												</AlertDialogTitle>
												<AlertDialogDescription>
													Are you sure you want to
													delete this post? This
													action cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>
													Cancel
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleDelete}
													className="bg-destructive hover:bg-destructive/90"
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
							</div>
						</div>
						<CardContent className="p-0 pt-1">
							<p className="text-sm whitespace-pre-wrap">
								{post.content}
							</p>

							<div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleVote(1)}
									disabled={isVoting}
									className={`flex items-center gap-1 h-8 px-2 ${
										userVote === 1
											? "text-green-600 bg-green-50 hover:bg-green-100"
											: "text-gray-500 hover:text-green-600 hover:bg-green-50"
									}`}
								>
									<ChevronUp className="h-4 w-4" />
								</Button>

								<span
									className={`text-sm font-medium min-w-[2rem] text-center ${
										score > 0
											? "text-green-600"
											: score < 0
												? "text-red-500"
												: "text-gray-500"
									}`}
								>
									{score}
								</span>

								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleVote(-1)}
									disabled={isVoting}
									className={`flex items-center gap-1 h-8 px-2 ${
										userVote === -1
											? "text-red-500 bg-red-50 hover:bg-red-100"
											: "text-gray-500 hover:text-red-500 hover:bg-red-50"
									}`}
								>
									<ChevronDown className="h-4 w-4" />
								</Button>
							</div>
						</CardContent>
					</div>
				</div>
			</CardHeader>
		</Card>
	);
}
