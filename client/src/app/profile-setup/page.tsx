"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";


export default function ProfileSetupPage() {
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!backendUrl) {
            setError("Backend URL not configured.");
            setIsLoading(false)
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/users/me/username`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ username: username }),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                const errorMessage = responseData.detail || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            console.log("Username set successfully: ", responseData);
            toast({
                title: "Success!",
                description: "Your Anon profile is ready.",
            });

            setTimeout(() => {
                router.push("/home");
            }, 1500);

        } catch (err: unknown) {
            console.log("Failed to set username: ", err);
            const message = err instanceof Error ? err.message : "An unknown error occured.";
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

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
            <Toaster />
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">
                        Set Up Your Anonymous Profile
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Choose your unique username (3-20 characters, letters,
                        numbers and underscore only).
                    </p>
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
                            minLength={3}
                            maxLength={20}
                            pattern="^[a-zA-Z0-9_]+$"
                            disabled={isLoading}
                            className="mt-1"
                        />
                        <p className="text-xs mt-1 text-muted-foreground">
                            Only letters numbers and underscores allowed.
                        </p>
                    </div>
                    {error && (
                        <p className="text-sm font-medium text-destructive">
                            {error}
                        </p>
                    )}
                    <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Set Username and Enter Anon"}
                    </Button>
                </form>
            </div>
        </main>
    );
}