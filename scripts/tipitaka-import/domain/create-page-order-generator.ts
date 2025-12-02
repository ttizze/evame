/**
 * 親ページごとにページの表示順序を生成する関数を返す
 * 同じ親の下に複数の子ページを作成する際に、0, 1, 2...という順序を割り当てる
 */
export function createPageOrderGeneratorForParents() {
	const pageOrderByParentId = new Map<number, number>();
	return (parentPageId: number) => {
		const nextPageOrder = pageOrderByParentId.get(parentPageId) ?? 0;
		pageOrderByParentId.set(parentPageId, nextPageOrder + 1);
		return nextPageOrder;
	};
}
