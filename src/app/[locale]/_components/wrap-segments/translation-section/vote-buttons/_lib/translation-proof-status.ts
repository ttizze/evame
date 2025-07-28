import { TranslationProofStatus } from "@prisma/client";

/**
 * 翻訳の証明ステータスを計算する
 *
 * @param totalSegments - 総セグメント数
 * @param segmentsWith1PlusVotes - 1票以上あるセグメント数
 * @param segmentsWith2PlusVotes - 2票以上あるセグメント数
 * @returns TranslationProofStatus
 */
export function calcProofStatus(
	totalSegments: number,
	segmentsWith1PlusVotes: number,
	segmentsWith2PlusVotes: number,
): TranslationProofStatus {
	if (segmentsWith1PlusVotes === 0) return TranslationProofStatus.MACHINE_DRAFT;
	if (segmentsWith1PlusVotes < totalSegments)
		return TranslationProofStatus.HUMAN_TOUCHED;
	if (segmentsWith2PlusVotes === totalSegments)
		return TranslationProofStatus.VALIDATED;
	// すべてのセグメントが1票以上あるが、すべてが2票以上あるわけではない場合
	return TranslationProofStatus.PROOFREAD;
}
