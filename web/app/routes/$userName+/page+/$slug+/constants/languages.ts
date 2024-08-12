export type TargetLanguage = {
	code: string;
	name: string;
};

export const targetLanguages: TargetLanguage[] = [
	{ code: "ab", name: "Аҧсуа" },
	{ code: "aa", name: "Afaraf" },
	{ code: "af", name: "Afrikaans" },
	{ code: "ak", name: "Akan" },
	{ code: "sq", name: "Shqip" },
	{ code: "am", name: "አማርኛ" },
	{ code: "ar", name: "العربية" },
	{ code: "an", name: "Aragonés" },
	{ code: "hy", name: "Հայերեն" },
	{ code: "as", name: "অসমীয়া" },
	{ code: "av", name: "авар мацӀ" },
	{ code: "ae", name: "avesta" },
	{ code: "ay", name: "aymar aru" },
	{ code: "az", name: "azərbaycan dili" },
	{ code: "bm", name: "bamanankan" },
	{ code: "ba", name: "башҡорт теле" },
	{ code: "eu", name: "euskara" },
	{ code: "be", name: "Беларуская" },
	{ code: "bn", name: "বাংলা" },
	{ code: "bh", name: "भोजपुरी" },
	{ code: "bi", name: "Bislama" },
	{ code: "bs", name: "bosanski jezik" },
	{ code: "br", name: "brezhoneg" },
	{ code: "bg", name: "български език" },
	{ code: "my", name: "ဗမာစာ" },
	{ code: "ca", name: "Català" },
	{ code: "ch", name: "Chamoru" },
	{ code: "ce", name: "нохчийн мотт" },
	{ code: "ny", name: "chiCheŵa" },
	{ code: "zh", name: "中文" },
	{ code: "cv", name: "чӑваш чӗлхи" },
	{ code: "kw", name: "Kernewek" },
	{ code: "co", name: "corsu" },
	{ code: "cr", name: "ᓀᐦᐃᔭᐍᐏᐣ" },
	{ code: "hr", name: "hrvatski" },
	{ code: "cs", name: "česky" },
	{ code: "da", name: "dansk" },
	{ code: "dv", name: "ދިވެހި" },
	{ code: "nl", name: "Nederlands" },
	{ code: "dz", name: "རྫོང་ཁ" },
	{ code: "en", name: "English" },
	{ code: "eo", name: "Esperanto" },
	{ code: "et", name: "eesti" },
	{ code: "ee", name: "Eʋegbe" },
	{ code: "fo", name: "føroyskt" },
	{ code: "fj", name: "vosa Vakaviti" },
	{ code: "fi", name: "suomi" },
	{ code: "fr", name: "français" },
	{ code: "ff", name: "Fulfulde" },
	{ code: "gl", name: "Galego" },
	{ code: "ka", name: "ქართული" },
	{ code: "de", name: "Deutsch" },
	{ code: "el", name: "Ελληνικά" },
	{ code: "gn", name: "Avañeẽ" },
	{ code: "gu", name: "ગુજરાતી" },
	{ code: "ht", name: "Kreyòl ayisyen" },
	{ code: "ha", name: "Hausa" },
	{ code: "he", name: "עברית" },
	{ code: "hz", name: "Otjiherero" },
	{ code: "hi", name: "हिन्दी" },
	{ code: "ho", name: "Hiri Motu" },
	{ code: "hu", name: "Magyar" },
	{ code: "ia", name: "Interlingua" },
	{ code: "id", name: "Bahasa Indonesia" },
	{ code: "ie", name: "Interlingue" },
	{ code: "ga", name: "Gaeilge" },
	{ code: "ig", name: "Asụsụ Igbo" },
	{ code: "ik", name: "Iñupiaq" },
	{ code: "io", name: "Ido" },
	{ code: "is", name: "Íslenska" },
	{ code: "it", name: "Italiano" },
	{ code: "iu", name: "ᐃᓄᒃᑎᑐᑦ" },
	{ code: "ja", name: "日本語" },
	{ code: "jv", name: "basa Jawa" },
	{ code: "kl", name: "kalaallisut" },
	{ code: "kn", name: "ಕನ್ನಡ" },
	{ code: "kr", name: "Kanuri" },
	{ code: "ks", name: "कश्मीरी" },
	{ code: "kk", name: "Қазақ тілі" },
	{ code: "km", name: "ភាសាខ្មែរ" },
	{ code: "ki", name: "Gĩkũyũ" },
	{ code: "rw", name: "Ikinyarwanda" },
	{ code: "ky", name: "кыргыз тили" },
	{ code: "kv", name: "коми кыв" },
	{ code: "kg", name: "KiKongo" },
	{ code: "ko", name: "한국어" },
	{ code: "ku", name: "Kurdî" },
	{ code: "kj", name: "Kuanyama" },
	{ code: "la", name: "latine" },
	{ code: "lb", name: "Lëtzebuergesch" },
	{ code: "lg", name: "Luganda" },
	{ code: "li", name: "Limburgs" },
	{ code: "ln", name: "Lingála" },
	{ code: "lo", name: "ພາສາລາວ" },
	{ code: "lt", name: "lietuvių kalba" },
	{ code: "lu", name: "Kiluba" },
	{ code: "lv", name: "latviešu valoda" },
	{ code: "gv", name: "Gaelg" },
	{ code: "mk", name: "македонски јазик" },
	{ code: "mg", name: "Malagasy fiteny" },
	{ code: "ms", name: "bahasa Melayu" },
	{ code: "ml", name: "മലയാളം" },
	{ code: "mt", name: "Malti" },
	{ code: "mi", name: "te reo Māori" },
	{ code: "mr", name: "मराठी" },
	{ code: "mh", name: "Kajin M̧ajeļ" },
	{ code: "mn", name: "монгол" },
	{ code: "na", name: "Ekakairũ Naoero" },
	{ code: "nv", name: "Diné bizaad" },
	{ code: "nd", name: "isiNdebele" },
	{ code: "ne", name: "नेपाली" },
	{ code: "ng", name: "Owambo" },
	{ code: "nb", name: "Norsk bokmål" },
	{ code: "nn", name: "Norsk nynorsk" },
	{ code: "no", name: "Norsk" },
	{ code: "ii", name: "ꆈꌠ꒿ Nuosuhxop" },
	{ code: "nr", name: "isiNdebele" },
	{ code: "oc", name: "Occitan" },
	{ code: "oj", name: "ᐊᓂᔑᓈᐯᒧᐎᓐ" },
	{ code: "cu", name: "ѩзыкъ словѣньскъ" },
	{ code: "om", name: "Afaan Oromoo" },
	{ code: "or", name: "ଓଡ଼ିଆ" },
	{ code: "os", name: "ирон æвзаг" },
	{ code: "pa", name: "ਪੰਜਾਬੀ" },
	{ code: "pi", name: "पाऴि" },
	{ code: "fa", name: "فارسی" },
	{ code: "pl", name: "polski" },
	{ code: "ps", name: "پښتو" },
	{ code: "pt", name: "Português" },
	{ code: "qu", name: "Runa Simi" },
	{ code: "rm", name: "rumantsch grischun" },
	{ code: "rn", name: "kiRundi" },
	{ code: "ro", name: "română" },
	{ code: "ru", name: "русский язык" },
	{ code: "sa", name: "संस्कृतम्" },
	{ code: "sc", name: "sardu" },
	{ code: "sd", name: "सिन्धी" },
	{ code: "se", name: "Davvisámegiella" },
	{ code: "sm", name: "gagana faa Samoa" },
	{ code: "sg", name: "yângâ tî sängö" },
	{ code: "sr", name: "српски језик" },
	{ code: "gd", name: "Gàidhlig" },
	{ code: "sn", name: "chiShona" },
	{ code: "si", name: "සිංහල" },
	{ code: "sk", name: "slovenčina" },
	{ code: "sl", name: "slovenščina" },
	{ code: "so", name: "Soomaaliga" },
	{ code: "st", name: "Sesotho" },
	{ code: "es", name: "español" },
	{ code: "su", name: "Basa Sunda" },
	{ code: "sw", name: "Kiswahili" },
	{ code: "ss", name: "SiSwati" },
	{ code: "sv", name: "svenska" },
	{ code: "ta", name: "தமிழ்" },
	{ code: "te", name: "తెలుగు" },
	{ code: "tg", name: "тоҷикӣ" },
	{ code: "th", name: "ไทย" },
	{ code: "ti", name: "ትግርኛ" },
	{ code: "bo", name: "བོད་ཡིག" },
	{ code: "tk", name: "Türkmen" },
	{ code: "tl", name: "Wikang Tagalog" },
	{ code: "tn", name: "Setswana" },
	{ code: "to", name: "faka Tonga" },
	{ code: "tr", name: "Türkçe" },
	{ code: "ts", name: "Xitsonga" },
	{ code: "tt", name: "татарча" },
	{ code: "tw", name: "Twi" },
	{ code: "ty", name: "Reo Tahiti" },
	{ code: "ug", name: "Uyƣurqə" },
	{ code: "uk", name: "українська" },
	{ code: "ur", name: "اردو" },
	{ code: "uz", name: "zbek" },
	{ code: "ve", name: "Tshivenḓa" },
	{ code: "vi", name: "Tiếng Việt" },
	{ code: "vo", name: "Volapük" },
	{ code: "wa", name: "Walon" },
	{ code: "cy", name: "Cymraeg" },
	{ code: "wo", name: "Wollof" },
	{ code: "fy", name: "Frysk" },
	{ code: "xh", name: "isiXhosa" },
	{ code: "yi", name: "ייִדיש" },
	{ code: "yo", name: "Yorùbá" },
	{ code: "za", name: "Saɯ cueŋƅ" },
	{ code: "zu", name: "isiZulu" },
];
