import type React from "react";
import { useEffect, useRef, useState } from "react";

const styles: { [key: string]: React.CSSProperties } = {
	tagBase: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "9999px",
		padding: "2px 8px",
		fontSize: "11px",
		fontWeight: "500",
		cursor: "help",
		position: "relative",
		overflow: "hidden",
		transition: "all 0.2s ease",
		boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
		border: "none",
		outline: "none",
	},

	builder: {
		background: "linear-gradient(to right, #f59e0b, #ea580c)",
		color: "white",
		boxShadow: "0 1px 3px 0 rgba(245, 158, 11, 0.1)",
	},

	waitlist: {
		background: "linear-gradient(to right, #8b5cf6, #4f46e5)",
		color: "white",
		boxShadow: "0 1px 3px 0 rgba(139, 92, 246, 0.1)",
	},

	early_user: {
		background: "linear-gradient(to right, #3b82f6, #06b6d4)",
		color: "white",
		boxShadow: "0 1px 3px 0 rgba(59, 130, 246, 0.1)",
	},

	tagHover: {
		transform: "scale(1.02)",
		boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
	},

	shine: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		background:
			"linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)",
		transform: "translateX(-100%) skewX(-12deg)",
		transition: "transform 0.6s ease-out",
	},

	shineHover: {
		transform: "translateX(100%) skewX(-12deg)",
	},

	tooltip: {
		position: "absolute",
		bottom: "100%",
		left: "50%",
		transform: "translateX(-50%)",
		marginBottom: "6px",
		padding: "6px 10px",
		backgroundColor: "#1f2937",
		color: "white",
		fontSize: "12px",
		borderRadius: "6px",
		boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
		zIndex: 10,
		whiteSpace: "nowrap",
	},

	tooltipArrow: {
		position: "absolute",
		top: "100%",
		left: "50%",
		transform: "translateX(-50%)",
		width: 0,
		height: 0,
		borderLeft: "3px solid transparent",
		borderRight: "3px solid transparent",
		borderTop: "3px solid #1f2937",
	},

	container: {
		position: "relative",
		display: "inline-block",
	},

	tagsContainer: {
		display: "flex",
		flexWrap: "wrap",
		gap: "6px",
	},
};

const tagConfig = {
	builder: {
		label: "Builder",
		description: "One of the creators of this platform",
	},
	waitlist: {
		label: "Waitlist",
		description: "Joined during the waitlist period",
	},
	early_user: {
		label: "Early User",
		description: "One of the first 100 users",
	},
};

function UserTag({ tag }: { tag: keyof typeof tagConfig }) {
	const [showTooltip, setShowTooltip] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setIsTouchDevice(
			"ontouchstart" in window || navigator.maxTouchPoints > 0,
		);
	}, []);

	useEffect(() => {
		const handleOutsideInteraction = (event: TouchEvent | MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				if (showTooltip && isTouchDevice) {
					setShowTooltip(false);
					setIsHovered(false);
				}
			}
		};

		if (showTooltip && isTouchDevice) {
			document.addEventListener(
				"touchstart",
				handleOutsideInteraction,
				true,
			);
			document.addEventListener("click", handleOutsideInteraction, true);
		}

		return () => {
			document.removeEventListener(
				"touchstart",
				handleOutsideInteraction,
				true,
			);
			document.removeEventListener(
				"click",
				handleOutsideInteraction,
				true,
			);
		};
	}, [showTooltip, isTouchDevice]);

	const config = tagConfig[tag];
	if (!config) return null;

	const handleMouseEnter = () => {
		if (!isTouchDevice) {
			setShowTooltip(true);
			setIsHovered(true);
		}
	};

	const handleMouseLeave = () => {
		if (!isTouchDevice) {
			setShowTooltip(false);
			setIsHovered(false);
		}
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		if (isTouchDevice) {
			setIsHovered(true);
			setShowTooltip(true);
		}
	};

	const tagStyle: React.CSSProperties = {
		...styles.tagBase,
		...styles[tag],
		...(isHovered ? styles.tagHover : {}),
	};

	const shineStyle: React.CSSProperties = {
		...styles.shine,
		...(isHovered ? styles.shineHover : {}),
	};

	return (
		<div style={styles.container} ref={containerRef}>
			<button
				type="button"
				style={tagStyle}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onTouchStart={handleTouchStart}
				tabIndex={0}
				aria-describedby={showTooltip ? `tooltip-${tag}` : undefined}
			>
				{/* shine */}
				<div style={shineStyle} />
				{config.label}
			</button>

			{/* tooltip */}
			{showTooltip && (
				<div
					style={styles.tooltip}
					id={`tooltip-${tag}`}
					role="tooltip"
				>
					{config.description}
					<div style={styles.tooltipArrow} />
				</div>
			)}
		</div>
	);
}

function UserTags({
	tags,
	className,
	style,
}: { tags: string[]; className?: string; style?: React.CSSProperties }) {
	if (!tags || tags.length === 0) return null;

	const validTags = tags.filter(tag => tag in tagConfig);
	if (validTags.length === 0) return null;

	return (
		<div
			style={{ ...styles.tagsContainer, ...style }}
			className={className}
		>
			{validTags.map(tag => (
				<UserTag key={tag} tag={tag as keyof typeof tagConfig} />
			))}
		</div>
	);
}

export default UserTags;
