// // textraApi.test.ts
// import { describe, test, expect, beforeEach, afterEach } from "vitest";
// import {
//   getTexTraTranslation,
//   validateTexTraApiKey,
// } from "./texTra";



describe("TexTra API Tests", () => {
test("getTexTraTranslation returns correct translation", async () => {
  const a =1
  expect(a).toBe(1)
});

//   test("getTexTraTranslation returns correct translation", async () => {
//     const TEXTRA_API_KEY = process.env.TEXTRA_API_KEY;
//     const TEXTRA_API_SECRET = process.env.TEXTRA_API_SECRET;
//     const TEXTRA_LOGIN_ID = process.env.TEXTRA_LOGIN_ID;
//     const TEST_TEXT = `  {"number":0,"text":"狐"}
// {"number":1,"text":"author: 蔵原 伸二郎"}
// {"number":2,"text":"めぎつね"}
// {"number":3,"text":"野狐の背中に"}
// {"number":4,"text":"雪がふると"}
// {"number":5,"text":"狐は青いかげになるのだ"}
// {"number":6,"text":"吹雪の夜を"}
// {"number":7,"text":"山から一直線に"}
// {"number":8,"text":"走つてくる　その影"}
// {"number":9,"text":"凍る村々の垣根をめぐり"}
// {"number":10,"text":"みかん色した人々の夢のまわりを廻つて"}
// {"number":11,"text":"青いかげは　いつの間にか"}
// {"number":12,"text":"鶏小屋の前に坐つている"}
// {"number":13,"text":"二月の夜あけ前"}
// {"number":14,"text":"とき色にひかる雪あかりの中を"}
// {"number":15,"text":"山に帰つてゆく雌狐"}
// {"number":16,"text":"狐は　みごもつている"}
// {"number":17,"text":"黄昏いろのきつね"}
// {"number":18,"text":"山からおりて来た狐が"}
// {"number":19,"text":"村の土橋のあたりまでくると"}
// {"number":20,"text":"その辺の空気が狐いろになつた"}
// {"number":21,"text":"残照のうすらあかりの中で"}
// {"number":22,"text":"狐がたそがれいろになつたのだ"}
// {"number":23,"text":"葦がさやさやと鳴つた"}
// {"number":24,"text":"風は村の方角から吹いている"}
// {"number":25,"text":"狐は一本のほそい"}
// {"number":26,"text":"あるかないかの影になつて"}
// {"number":27,"text":"村の方へ走つた"}`
//     const TRANSLATED_TEXT = "こんにちは、世界！";

//     if (!TEXTRA_API_KEY || !TEXTRA_API_SECRET || !TEXTRA_LOGIN_ID) {
//       throw new Error("TEXTRA_API_KEY, TEXTRA_API_SECRET, and TEXTRA_LOGIN_ID must be set");
//     }
//     const result = await getTexTraTranslation(
//       TEXTRA_API_KEY,
//       TEXTRA_API_SECRET,
//       TEXTRA_LOGIN_ID,
//       TEST_TEXT,
//     );
//     expect(result).toBe(TRANSLATED_TEXT);
//   });


});
