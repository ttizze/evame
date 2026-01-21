import { describe, expect, test } from "vitest";
import { getLocaleFromHtml } from "./get-locale-from-html";

// francで検出可能な言語
const detectableLocales = [
	"en",
	"zh",
	"es",
	"ar",
	"pt",
	"fr",
	"ja",
	"ru",
	"de",
	"vi",
	"ko",
	"tr",
	"it",
	"th",
	"pl",
	"nl",
	"tl",
	"hi",
];

// francで検出不可の言語（userLocaleにフォールバック）
// @see docs/adr/20260121-language-detection-library.md
const undetectableLocales = ["id", "fa", "pi"];

describe("getLocaleFromHtml", () => {
	test("英語（長文）のコンテンツを正しく検出できるか", async () => {
		const numberedContent = `
      <p>
        This is a long paragraph in English to test whether the language detection
        library can correctly identify the primary language when given a fair
        amount of text. Having multiple sentences with varied vocabulary helps
        the detector reliably classify the language as English.
      </p>
      <p>
        One day, as I wandered through the streets of London, I found myself
        enchanted by the rich tapestry of history that wove itself into every
        stone and corner of the city.
      </p>
    `;
		const language = await getLocaleFromHtml(numberedContent, "en");
		expect(language).toBe("en");
	});

	test("スペイン語（長文）のコンテンツを正しく検出できるか", async () => {
		const numberedContent = `
      <p>
        Este es un párrafo más extenso en español para comprobar si la librería
        reconoce correctamente el idioma principal. Al incluir varias oraciones
        con un vocabulario variado, esperamos que el detector identifique el
        español sin problemas.
      </p>
      <p>
        Un día, mientras caminaba por las calles de Madrid, descubrí la
        influencia de la arquitectura antigua mezclada con los edificios modernos.
      </p>
    `;
		const language = await getLocaleFromHtml(numberedContent, "en");
		expect(language).toBe("es");
	});

	test("日本語（長文）のコンテンツを正しく検出できるか", async () => {
		const numberedContent = `
      <p>
        これは日本語の長めの文章です。日本語の文章を豊富に用意することで、
        言語検出ライブラリがしっかりと日本語を判定できる可能性が高まります。
        また、同じフレーズを繰り返すのではなく、いろいろな表現を使うことが望ましいです。
      </p>
      <p>
        昔々あるところに、おじいさんとおばあさんが住んでいました。
        おじいさんは山へ柴刈りに、おばあさんは川へ洗濯に行きました。
      </p>
    `;
		const language = await getLocaleFromHtml(numberedContent, "en");
		expect(language).toBe("ja");
	});

	test("英語とスペイン語が混在するコンテンツの主要言語を検出できるか", async () => {
		const numberedContent = `
      <p>
        This paragraph starts in English, but then it switches to Spanish to see
        how the language detector behaves. Vamos a ver si el detector de idioma
        logra identificar correctamente qué lengua domina en este texto.
      </p>
      <p>
        The content is mostly written in English, but with a fair number of
        Spanish sentences sprinkled throughout.
      </p>
    `;
		const language = await getLocaleFromHtml(numberedContent, "en");
		// 主要言語が "en" または "es" と検出されることを想定
		expect(["en", "es"]).toContain(language);
	});

	test("短いテキストでも検出できるか（bestEffort）", async () => {
		const shortContent = "<p>Hello world, this is a test.</p>";
		const language = await getLocaleFromHtml(shortContent, "ja");
		expect(language).toBe("en");
	});

	test("短い日本語テキストでも検出できるか", async () => {
		const shortContent = "<p>こんにちは、これはテストです。</p>";
		const language = await getLocaleFromHtml(shortContent, "en");
		expect(language).toBe("ja");
	});
});

describe("getLocaleFromHtml - francで検出可能な18言語", () => {
	const languageSamples: Record<string, string> = {
		en: `<p>The United States of America is a country located in North America.
			It consists of 50 states and various territories. The capital city is Washington D.C.
			Programming is the process of creating instructions that tell a computer how to perform tasks.
			The English language is widely spoken around the world and serves as a global lingua franca.</p>`,
		zh: `<p>这是一段较长的中文测试文本，用于检测语言识别功能的准确性。中国是一个历史悠久的国家，
			拥有丰富的文化遗产和传统。中文是世界上使用人数最多的语言之一。</p>`,
		es: `<p>Este es un texto de prueba más largo en español para la detección de idiomas.
			España es conocida por su rica cultura, su deliciosa gastronomía y su fascinante historia.</p>`,
		ar: `<p>هذا نص اختباري طويل باللغة العربية لاختبار قدرات اكتشاف اللغة. اللغة العربية هي واحدة
			من أقدم اللغات في العالم ولها تاريخ غني وثقافة عميقة.</p>`,
		pt: `<p>Este é um texto de teste mais longo em português para verificar a detecção de idioma.
			Portugal é um país com uma história rica e uma cultura fascinante.</p>`,
		fr: `<p>Ceci est un texte de test plus long en français pour vérifier la détection de langue.
			La France est connue pour sa culture, sa gastronomie et son histoire riche.</p>`,
		ja: `<p>これは言語検出機能をテストするための長めの日本語サンプルテキストです。日本は古い歴史と
			豊かな文化を持つ国です。日本語は独特の文字体系を持っています。</p>`,
		ru: `<p>Это более длинный тестовый текст на русском языке для проверки определения языка.
			Россия является самой большой страной в мире по площади территории.</p>`,
		de: `<p>Dies ist ein längerer Testtext auf Deutsch zur Überprüfung der Spracherkennung.
			Deutschland ist bekannt für seine Ingenieurskunst, seine Kultur und Geschichte.</p>`,
		vi: `<p>Đây là một văn bản thử nghiệm dài hơn bằng tiếng Việt để kiểm tra khả năng phát hiện ngôn ngữ.
			Việt Nam là một quốc gia có lịch sử lâu đời và văn hóa phong phú.</p>`,
		ko: `<p>이것은 언어 감지 기능을 테스트하기 위한 더 긴 한국어 샘플 텍스트입니다. 한국은 풍부한
			문화와 역사를 가진 나라입니다.</p>`,
		tr: `<p>Bu, dil algılama yeteneklerini test etmek için Türkçe yazılmış daha uzun bir test metnidir.
			Türkiye, zengin bir tarihe ve kültüre sahip bir ülkedir.</p>`,
		it: `<p>Questo è un testo di prova più lungo in italiano per verificare il rilevamento della lingua.
			L'Italia è conosciuta per la sua ricca cultura e la sua deliziosa cucina.</p>`,
		th: `<p>นี่คือข้อความทดสอบที่ยาวขึ้นในภาษาไทยเพื่อตรวจสอบความสามารถในการตรวจจับภาษา
			ประเทศไทยเป็นประเทศที่มีประวัติศาสตร์และวัฒนธรรมที่รุ่งเรือง</p>`,
		pl: `<p>To jest dłuższy tekst testowy w języku polskim do sprawdzenia wykrywania języka.
			Polska jest krajem o bogatej historii i kulturze.</p>`,
		nl: `<p>Dit is een langere testtekst in het Nederlands om de taaldetectie te controleren.
			Nederland is bekend om zijn rijke geschiedenis, cultuur en handelsgeest.</p>`,
		tl: `<p>Ito ay isang mas mahabang teksto ng pagsubok sa Filipino upang suriin ang kakayahang
			makilala ang wika. Ang Pilipinas ay isang bansang may mayamang kasaysayan at kultura.</p>`,
		hi: `<p>यह भाषा पहचान क्षमताओं का परीक्षण करने के लिए हिंदी में एक लंबा नमूना पाठ है।
			भारत एक समृद्ध इतिहास और विविध संस्कृति वाला देश है।</p>`,
	};

	for (const locale of detectableLocales) {
		test(`${locale} を正しく検出できるか`, async () => {
			const html = languageSamples[locale];
			const detected = await getLocaleFromHtml(html, "en");
			expect(detected).toBe(locale);
		});
	}
});

describe("getLocaleFromHtml - francで検出不可な言語（userLocaleにフォールバック）", () => {
	const undetectableSamples: Record<string, string> = {
		id: `<p>Ini adalah teks percobaan yang lebih panjang dalam bahasa Indonesia untuk menguji
			kemampuan deteksi bahasa. Indonesia adalah negara kepulauan terbesar di dunia.</p>`,
		fa: `<p>این یک متن آزمایشی طولانی‌تر به زبان فارسی برای بررسی قابلیت تشخیص زبان است. زبان فارسی
			یکی از زبان‌های کهن جهان است و تاریخ و فرهنگ غنی دارد.</p>`,
		pi: `<p>Namo tassa bhagavato arahato sammāsambuddhassa. Evaṃ me sutaṃ ekaṃ samayaṃ bhagavā
			sāvatthiyaṃ viharati jetavane anāthapiṇḍikassa ārāme.</p>`,
	};

	for (const locale of undetectableLocales) {
		test(`${locale} は検出不可のためuserLocaleにフォールバック`, async () => {
			const html = undetectableSamples[locale];
			const userLocale = "ja";
			const detected = await getLocaleFromHtml(html, userLocale);
			// francで検出できないためuserLocaleにフォールバック
			expect(detected).toBe(userLocale);
		});
	}
});
