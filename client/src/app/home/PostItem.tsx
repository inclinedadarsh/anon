import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface PostAuthor {
	author_id: string | number;
	username: string;
}

export interface FetchedPost {
	id: number;
	content: string;
	created_at: string;
	author: PostAuthor;
}

interface PostItemProps {
	post: FetchedPost;
	getInitials: (name: string | null | undefined) => string;
	formatDate: (dateString: string) => string;
}

export default function PostItem({
	post,
	getInitials,
	formatDate,
}: PostItemProps) {
	return (
		<Card
			key={post.id}
			className="border-none rounded-none shadow-none border-b border-gray-200 pb-4"
		>
			<CardHeader className="p-0 pb-2">
				<div className="flex space-x-3">
					<Link
						href={`/${post.author.username}`}
						className="flex items-center"
					>
						<Avatar className="h-10 w-10 mt-1 cursor-pointer">
							<AvatarFallback>
								{getInitials(post.author.username)}
							</AvatarFallback>
						</Avatar>
					</Link>
					<div className="flex flex-col flex-1">
						<div className="flex items-center justify-between">
							<Link
								href={`/${post.author.username}`}
								className="hover:underline"
							>
								<CardTitle className="text-sm font-medium cursor-pointer">
									{post.author.username}
								</CardTitle>
							</Link>
							<p className="text-xs text-muted-foreground">
								{formatDate(post.created_at)}
							</p>
						</div>
						<CardContent className="p-0 pt-1">
							<p className="text-sm whitespace-pre-wrap">
								{post.content}
							</p>
						</CardContent>
					</div>
				</div>
			</CardHeader>
		</Card>
	);
}
