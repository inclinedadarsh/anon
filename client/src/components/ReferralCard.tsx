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
			<Card className="p-4 bg-transparent border-0 shadow-none">
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
			<Card className="p-4 bg-transparent border-0 shadow-none">
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
		<Card className="p-4 bg-transparent border-0 shadow-none">
			<p className="font-semibold text-base mb-2">Refer Friends</p>
			<CardContent className="p-0 space-y-3">
				{stats?.referral_code ? (
					<>
						<div className="flex items-center gap-2">
							<Input
								value={referralLink}
								readOnly
								className="flex-1 text-xs px-2 py-1 h-8 bg-muted border-none"
							/>
							<Button
								onClick={copyReferralLink}
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								title="Copy link"
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						{(stats.total_referrals > 0 ||
							stats.successful_referrals > 0) && (
							<div className="flex justify-between text-xs text-muted-foreground pt-1">
								<span>{stats.total_referrals} invited</span>
								<span>{stats.successful_referrals} joined</span>
								<span>{stats.remaining_referrals} left</span>
							</div>
						)}
					</>
				) : (
					<div className="text-center py-2">
						<p className="text-xs text-muted-foreground mb-2">
							Generate your referral link to invite friends!
						</p>
						<Button
							onClick={generateReferralCode}
							size="sm"
							className="text-xs px-3 py-1"
						>
							Generate Link
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
