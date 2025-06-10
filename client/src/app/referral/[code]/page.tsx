"use client";

import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { Loader2, UserPlus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ReferralValidation {
	is_valid: boolean;
	code?: string;
	referrer_username?: string;
	remaining_uses?: number;
}

export default function ReferralPage() {
	const params = useParams();
	const router = useRouter();
	const code = params.code as string;

	const [validation, setValidation] = useState<ReferralValidation | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	const triggerConfetti = useCallback(() => {
		confetti({
			particleCount: 60,
			angle: 60,
			spread: 55,
			origin: { x: 0.4, y: 0.6 },
			colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
		});

		confetti({
			particleCount: 60,
			angle: 120,
			spread: 55,
			origin: { x: 0.6, y: 0.6 },
			colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
		});
	}, []);

	useEffect(() => {
		const validateCode = async () => {
			try {
				const response = await fetch(
					`${backendUrl}/referral/validate/${code}`,
				);
				const data = await response.json();
				setValidation(data);

				if (!data.is_valid) {
					setError("This referral code is invalid or has expired.");
				} else {
					setTimeout(() => triggerConfetti(), 100);
				}
			} catch (err) {
				setError("Failed to validate referral code.");
			} finally {
				setLoading(false);
			}
		};

		if (code) {
			validateCode();
		}
	}, [code, backendUrl, triggerConfetti]);

	const handleJoinNow = () => {
		window.location.href = `${backendUrl}/referral/${code}`;
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="w-full max-w-md text-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4 mx-auto" />
					<p className="text-sm text-muted-foreground">
						Validating referral code...
					</p>
				</div>
			</div>
		);
	}

	if (error || !validation?.is_valid) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="w-full max-w-md text-center">
					<div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4 mx-auto">
						<X className="h-6 w-6 text-destructive" />
					</div>
					<h1 className="text-xl font-semibold mb-2">
						Invalid Referral Code
					</h1>
					<p className="text-sm text-muted-foreground mb-6">
						{error}
					</p>
					<Button onClick={() => router.push("/")} variant="outline">
						Go Home
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-md text-center space-y-6 mb-12">
				<div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
					<UserPlus className="h-6 w-6 text-primary" />
				</div>

				<div>
					<h1 className="text-2xl font-semibold mb-2">
						You are Invited!
					</h1>
					<p className="text-muted-foreground">
						<span className="font-medium text-foreground">
							@{validation.referrer_username}
						</span>{" "}
						has invited you to join Anon.
					</p>
				</div>
			</div>

			<div className="space-y-4">
				<Button onClick={handleJoinNow} size="lg">
					Sign Up Now with Google
				</Button>

				<p className="text-xs text-muted-foreground">
					Only @kkwagh.edu.in emails are accepted.
				</p>
			</div>
		</div>
	);
}
