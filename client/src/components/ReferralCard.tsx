"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

interface ReferralStats {
	referral_code: string | null;
	total_referrals: number;
	successful_referrals: number;
	remaining_referrals: number;
}

export default function ReferralCard() {
	const [stats, setStats] = useState<ReferralStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();
	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

	useEffect(() => {
		fetchReferralStats();
	}, []);

	const fetchReferralStats = async () => {
		try {
			const response = await fetch(`${backendUrl}/referral/me`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				setStats(data);
			} else {
				setError("Failed to load referral data");
			}
		} catch (err) {
			setError("Failed to load referral data");
		} finally {
			setLoading(false);
		}
	};

	const generateReferralCode = async () => {
		try {
			const response = await fetch(`${backendUrl}/referral/generate`, {
				method: "POST",
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				setStats(data);
				toast({
					title: "Referral link generated!",
					description:
						"You can now share your referral link with friends.",
				});
			} else {
				setError("Failed to generate referral link");
			}
		} catch (err) {
			setError("Failed to generate referral link");
		}
	};

	const copyReferralLink = async () => {
		if (!stats?.referral_code) return;
		const referralLink = `${window.location.origin}/referral/${stats.referral_code}`;
		await navigator.clipboard.writeText(referralLink);
		toast({
			title: "Link copied!",
			description: "Referral link has been copied to your clipboard.",
		});
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<div className="h-5 bg-muted rounded w-24 animate-pulse" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="h-4 bg-muted rounded w-32 animate-pulse" />
						<div className="h-9 bg-muted rounded animate-pulse" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Refer Friends</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-4">
						{error}
					</p>
					<Button
						onClick={fetchReferralStats}
						variant="outline"
						size="sm"
					>
						Try again
					</Button>
				</CardContent>
			</Card>
		);
	}

	const referralLink = stats?.referral_code
		? `${window.location.origin}/referral/${stats.referral_code}`
		: "";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Refer Friends</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{stats?.referral_code ? (
					<>
						<div className="flex gap-2">
							<Input
								value={referralLink}
								readOnly
								className="flex-1"
							/>
							<Button
								onClick={copyReferralLink}
								size="icon"
								variant="outline"
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>

						{(stats.total_referrals > 0 ||
							stats.successful_referrals > 0) && (
							<div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
								<span>{stats.total_referrals} invited</span>
								<span>{stats.successful_referrals} joined</span>
								<span>
									{stats.remaining_referrals} remaining
								</span>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-4">
						<p className="text-sm text-muted-foreground mb-4">
							Generate your referral link to start inviting
							friends!
						</p>
						<Button onClick={generateReferralCode}>
							Generate Referral Link
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
