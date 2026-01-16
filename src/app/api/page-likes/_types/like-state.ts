export type LikeState = {
	liked: boolean;
	likeCount: number;
};

//pageIdをkeyとして、Stateの配列を返す
export type LikeStatesResponse = {
	states: Record<string, LikeState>;
};
