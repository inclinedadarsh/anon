'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface FetchedPost {
    id: number;
    content: string;
    created_at: string;
    author: PostAuthor;
}

export default function HomePage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [postContent, setPostContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [errorPost, setErrorPost] = useState<string | null>(null);
    const [posts, setPosts] = useState<FetchedPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [errorLodingPosts, setErrorLoadingPosts] = useState<string | null>(null);
    const [isLogginOut, setIsLoggingOut] = useState(false);

    const router = useRouter();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const { toast } = useToast()

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!backendUrl) {
                setError("Backend url not set.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/users/me`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    console.log("Unauthorized access to /users/me. Redirecting to login.")
                    router.push("/");
                    return;
                }

                if (!response.ok) {
                    const responseData = await response.json().catch(() => ({}))
                    const errorMessage = responseData.detail || `Error ${response.status}`;
                    throw new Error(errorMessage);
                }

                const userData: UserProfile = await response.json();
                if (!userData.username) {

                }
                setUser(userData);
            } catch (err: unknown) {
                console.log("Failed to fetch user profile.")
                const message = err instanceof Error ? err.message : "Could not load user data.";
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserProfile();

    }, [backendUrl, router]);

    const fetchPosts = async () => {
        setIsLoadingPosts(true);
        setErrorLoadingPosts(null);

        if (isLoading || !user || !backendUrl) {
            setIsLoadingPosts(true);
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/posts/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application",
                },
                credentials: "include",
            });

            if (!response.ok) {
                const responseData = await response.json().catch(() => ({}));
                throw new Error(responseData.detail || `Error ${response.status}`);
            }

            const postData: FetchedPost[] = await response.json();
            setPosts(postData);
        } catch (error: unknown) {
            console.error("failed to fetch posts: ", error);
            const message = error instanceof Error ? error.message : "could not load posts";
            setErrorLoadingPosts(message);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    useEffect(() => {
        if (!isLoading && user) {
            fetchPosts();
        }
    }, [isLoading, user]);

    const handlePostSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!postContent.trim()) {
            setError("Post content cannot be empty.");
            return;
        }
        setIsPosting(true);
        setErrorPost(null);
        if (!backendUrl) {
            setError("Backend URL is not set.");
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

            if (response.status === 401 || response.status === 403) {
                setErrorPost("Authentication error. Log in again.");
                router.push("/");
                return;
            }

            if (!response.ok) {
                const errorMessage = responseData.detail || `Error ${response.status}`;
                throw new Error(errorMessage);
            }

            toast({
                title: "Success!",
                description: "Your post has been submitted."
            });
            setPostContent("");
            console.log("new post created:", responseData);
            fetchPosts();
            console.log("fetched new posts...")
        } catch (error: unknown) {
            console.log("failed to create post: ", error)
            const message = error instanceof Error ? error.message : "Could not submit post.";
            setErrorPost(message);
            toast({
                title: "Post Error",
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsPosting(false);
        }
    };

    const logoutHandler = async () => {
        setIsLoggingOut(true);
        if (!backendUrl) {
            toast({
                variant: "destructive",
                title: "Logout Error",
                description: "Backend URL not configured."
            });
            setIsLoggingOut(false);
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

            if (!response.ok) {
                console.log("logout failed");
                const data = await response.json().catch(() => ({}));
                toast({ variant: "destructive", title: "logout failed", description: data.detail || "logout failed. some issue with the backend." });
            }
            else {
                toast({ title: "Logged out", description: "See you later" });
            }
        } catch (error) {
            console.error("error during logout fetch: ", error);
        } finally {
            console.log("redirecting to login page after logout attempt");
            router.push("/");
            setUser(null);
            setPosts([]);
            setIsLoggingOut(false);            
        }
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

    const getInitials = (name: string = "") => {
        return name?.charAt(0).toUpperCase() || "?";
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24">
                <p>
                    Loading user...
                </p>
            </main>
        )
    }

    if (!user && !error) {
        return (
            <main className="flex min-h-screen flex-col p-24 items-center justify-center">
                <p>Redirecting...</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col p-6 pt-12 md:p-24 items-center">
            <div className="w-full max-w- space-y-8">

                <h1 className="text-3xl font-bold">
                    Supp, {user?.username}. Been a minute.
                </h1>

                <Button 
                variant="outline"
                onClick={logoutHandler}
                disabled={isLogginOut}
                >
                    {isLogginOut ? "Logging out.." : "Logout"}
                </Button>

                <form onSubmit={handlePostSubmit} className="space-y-3">
                    <Textarea
                        placeholder="What's on your mind? Share anonymously..."
                        value={postContent}
                        onChange={(event) => setPostContent(event.target.value)}
                        required
                        rows={4}
                        disabled={isPosting}
                        className="resize-none focus-visible:ring-0"
                    />
                    {errorPost && <p className="text-sm text-destructive">{errorPost}</p>}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPosting || !postContent.trim()}>
                            {isPosting ? "Posting..." : "Post Anonymously"}
                        </Button>
                    </div>
                </form>


                <div className="pt-8 space-y-4">
                    {isLoadingPosts && <p>Loading posts...</p>}

                    {errorLodingPosts && <p className="text-destructive">Error loading posts: {errorLodingPosts}</p>}

                    {!isLoadingPosts && !errorLodingPosts && posts.map((post) => (
                        // <Card key={post.id} className="rounded-none shadow-none border-none border-gray-200">
                        //     <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                        //         <Avatar>
                        //             <AvatarFallback>
                        //             {getInitials(post.author.username)}
                        //             </AvatarFallback>
                        //         </Avatar>
                        //         <div className="flex flex-col">
                        //             <CardTitle className="text-sm font-medium">
                        //                 {post.author.username}
                        //             </CardTitle>
                        //             <p className="text-xs text-muted-foreground">
                        //                 {formatDate(post.created_at)}
                        //             </p>
                        //         </div>
                        //     </CardHeader>
                        //     <CardContent>
                        //         <p className="whitespace-pre-wrap">{post.content}</p>
                        //     </CardContent>
                        // </Card>
                        <Card key={post.id} className="border-none rounded-none shadow-none border-b border-gray-200 pb-4">
                            <CardHeader className="p-0 pb-2">
                                <div className="flex space-x-3">
                                    <Avatar className="h-10 w-10 mt-1">
                                        <AvatarFallback>{getInitials(post.author.username)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-medium">
                                                {post.author.username}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(post.created_at)}
                                            </p>
                                        </div>
                                        <CardContent className="p-0 pt-1">
                                            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                                        </CardContent>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        </main>
    );
}
