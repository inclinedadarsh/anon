import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
	const backendLoginUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google/login`;
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<div className="text-center">
				<h1 className="text-4xl font-bold mb-8">Welcome to Anon</h1>
				<p className="mb-8 text-lg text-muted-foreground">
					Login with your KKWagh Google Account to continue.
				</p>
				<a href={backendLoginUrl}>
					<Button size="lg">
						Login with Google
					</Button>
				</a>
			</div>
		</main>
	)
}
