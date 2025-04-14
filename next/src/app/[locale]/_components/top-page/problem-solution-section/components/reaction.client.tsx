"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

// Define reaction types
type ReactionType = "like" | "comment" | "notification";

interface User {
	id: string;
	name: string;
	image: string;
}

interface Reaction {
	id: string;
	type: ReactionType;
	user: User;
	content?: string;
}

// Sample data for the reactions with valid Avatar URLs
const sampleUsers: User[] = [
	{
		id: "1",
		name: "AA",
		image: "https://avatars.githubusercontent.com/u/1?v=4",
	},
	{
		id: "2",
		name: "Bob",
		image: "https://avatars.githubusercontent.com/u/2?v=4",
	},
	{
		id: "3",
		name: "Charlie",
		image: "https://avatars.githubusercontent.com/u/3?v=4",
	},
	{
		id: "4",
		name: "David",
		image: "https://avatars.githubusercontent.com/u/4?v=4",
	},
	{
		id: "5",
		name: "Eva",
		image: "https://avatars.githubusercontent.com/u/5?v=4",
	},
	{
		id: "6",
		name: "FG",
		image: "https://avatars.githubusercontent.com/u/6?v=4",
	},
	{
		id: "7",
		name: "George",
		image: "https://avatars.githubusercontent.com/u/7?v=4",
	},
	{
		id: "8",
		name: "Hunter",
		image: "https://avatars.githubusercontent.com/u/8?v=4",
	},
	{
		id: "9",
		name: "Ivy",
		image: "https://avatars.githubusercontent.com/u/9?v=4",
	},
];

// 10種類の異なる反応を用意
const sampleReactions: Reaction[] = [
	{
		id: "1",
		type: "like",
		user: sampleUsers[0],
	},
	{
		id: "2",
		type: "comment",
		user: sampleUsers[1],
		content: `This is a great platform! I've been looking for something that helps developers showcase their work globally.`,
	},
	{
		id: "3",
		type: "notification",
		user: sampleUsers[2],
	},
	{
		id: "4",
		type: "comment",
		user: sampleUsers[4],
		content: "I love how Evame handles translations automatically.",
	},
	{
		id: "5",
		type: "like",
		user: sampleUsers[3],
	},
	{
		id: "6",
		type: "notification",
		user: sampleUsers[5],
	},
	{
		id: "7",
		type: "like",
		user: sampleUsers[6],
	},
	{
		id: "8",
		type: "comment",
		user: sampleUsers[7],
		content: "The UI is so intuitive and clean!",
	},
	{
		id: "9",
		type: "comment",
		user: sampleUsers[8],
		content: "This will help me reach a global audience.",
	},
];

// Component for a single reaction
const ReactionItem = ({ reaction }: { reaction: Reaction }) => {
	// Render different icons based on reaction type
	const renderIcon = () => {
		switch (reaction.type) {
			case "like":
				return <Heart className="h-5 w-5 text-red-500" fill="currentColor" />;
			case "comment":
				return <MessageCircle className="h-5 w-5 text-blue-500" />;
			case "notification":
				return <Bell className="h-5 w-5 text-yellow-500" />;
			default:
				return null;
		}
	};

	return (
		<div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 rounded-full px-3 py-2 shadow-md">
			<Avatar className="w-8 h-8">
				<AvatarImage src={reaction.user.image} alt={reaction.user.name} />
				<AvatarFallback>
					{reaction.user.name.charAt(0).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">{reaction.user.name}</span>
				{renderIcon()}
				{reaction.content && (
					<span className="text-sm text-gray-500 max-w-[200px] truncate">
						{reaction.content}
					</span>
				)}
			</div>
		</div>
	);
};

interface ReactionsProps {
	pageId?: number; // Optional pageId to fetch real data (future implementation)
	className?: string;
}

export default function Reactions({ pageId, className = "" }: ReactionsProps) {
	const [displayedReactions, setDisplayedReactions] = useState<
		Array<Reaction & { left: number; top: number }>
	>([]);

	useEffect(() => {
		// 均等に配置するための位置を計算
		const positions = [
			// 左上
			{ left: 5, top: 5 },
			// 中央上
			{ left: 35, top: 0 },
			// 右上
			{ left: 65, top: 5 },
			// 左中央
			{ left: 0, top: 35 },
			// 中央
			{ left: 30, top: 30 },
			// 右中央
			{ left: 70, top: 35 },
			// 左下
			{ left: 5, top: 65 },
			// 中央下
			{ left: 35, top: 70 },
			// 右下
			{ left: 65, top: 65 },
			// 右下隅
			{ left: 75, top: 75 },
		];

		// 反応を配置
		const reactions = sampleReactions.map((reaction, index) => ({
			...reaction,
			id: `${reaction.id}-static`,
			left: positions[index % positions.length].left,
			top: positions[index % positions.length].top,
		}));

		setDisplayedReactions(reactions);
	}, []);

	return (
		<div className={`relative w-full h-64 overflow-hidden ${className}`}>
			{displayedReactions.map((reaction) => (
				<div
					key={reaction.id}
					className="absolute"
					style={{
						left: `${reaction.left}%`,
						top: `${reaction.top}%`,
						maxWidth: "calc(100% - 20px)", // はみ出し防止
						zIndex: Math.floor(Math.random() * 10), // ランダムな重なり順
					}}
				>
					<ReactionItem reaction={reaction} />
				</div>
			))}
		</div>
	);
}
