use evame_comrak_probe::evaluate;

#[test]
fn 日本語と英字の斜体と太字を保存して再解析する() {
    let result = evaluate("*日本語* **太字** ***both***\n", true, None);
    assert_eq!(
        result["html"],
        "<p><em>日本語</em> <strong>太字</strong> <em><strong>both</strong></em></p>\n"
    );
    assert_eq!(result["roundtripHtml"], result["html"]);
}

#[test]
fn 入力した記号を装飾やタグへ変えず保存する() {
    let result = evaluate(
        "元の文字\n",
        false,
        Some("*装飾ではない* <b>&amp;</b> [文字](url)"),
    );
    assert_eq!(
        result["html"],
        "<p>*装飾ではない* &lt;b&gt;&amp;amp;&lt;/b&gt; [文字](url)</p>\n"
    );
    assert_eq!(result["roundtripHtml"], result["html"]);
}

#[test]
fn 表のセルへパイプを入力しても列を増やさない() {
    let result = evaluate("| 見出し |\n| --- |\n| 内容 |\n", true, Some("a | b"));
    assert!(result["html"].as_str().unwrap().contains("<th>a | b</th>"));
    assert_eq!(result["roundtripHtml"], result["html"]);
}

#[test]
fn リスト内の参照定義を含む文書を再編集しても外側のリンクを解決する() {
    let first = evaluate(
        "- 項目\n\n  [ref]: /url \"題名\"\n\n外側の[参照][ref]\n",
        true,
        Some("変更"),
    );
    assert!(
        first["html"]
            .as_str()
            .unwrap()
            .contains("href=\"/url\" title=\"題名\"")
    );
    let second = evaluate(first["markdown"].as_str().unwrap(), true, Some("再編集"));
    assert!(
        second["html"]
            .as_str()
            .unwrap()
            .contains("href=\"/url\" title=\"題名\"")
    );
    assert_eq!(second["roundtripHtml"], second["html"]);
}

#[test]
fn 画像説明の装飾や入れ子のリンクを保存して再解析する() {
    for source in [
        "![foo *bar*](/url)",
        "![foo **bar**](/url)",
        "![foo `bar`](/url)",
        "![foo [bar](/link)](/url)",
        "![foo ![bar](/image)](/url)",
    ] {
        let result = evaluate(source, true, None);
        assert_eq!(result["tree"], result["roundtripTree"], "{source}");
    }
}

#[test]
fn タブと行端の空白とユニコード区切り文字を入力して再解析する() {
    let mut differences = Vec::new();
    for text in [
        "    行頭",
        "行末  ",
        "\t本文",
        " \t本文",
        "\t",
        "本文\t",
        "前\u{2028}後",
        "前\u{2029}後",
        "前\u{0085}後",
        "前\u{000b}後",
        "前\u{000c}後",
    ] {
        let result = evaluate("元の文字\n", true, Some(text));
        if result["tree"] != result["roundtripTree"] {
            differences.push(format!("{text:?}: {}", result["markdown"]));
        }
    }
    assert!(differences.is_empty(), "{}", differences.join("\n"));
}

#[test]
fn 番号の開始値と入れ子とコードと表を保存して再解析する() {
    let mut differences = Vec::new();
    for source in [
        "3. 最初\n   - 子\n4. 後続\n",
        "> 引用と**太字**\n>\n> - リスト\n",
        "```swift\nlet text = \"```\"\n\n```\n",
        "| 左 | 中央 | 右 |\n| :--- | :---: | ---: |\n| `a|b` | **太字** | c |\n",
    ] {
        let result = evaluate(source, true, None);
        if result["tree"] != result["roundtripTree"] || result["html"] != result["roundtripHtml"] {
            differences.push(format!("{source:?}: {}", result["markdown"]));
        }
    }
    assert!(differences.is_empty(), "{}", differences.join("\n"));
}

#[test]
fn 埋め草を持たない空のチェック項目を保存して再解析する() {
    let result = evaluate("- [ ]\n- [x] 完了\n", true, None);
    assert_eq!(
        result["html"],
        "<ul>\n<li><input type=\"checkbox\" disabled=\"\" /> </li>\n<li><input type=\"checkbox\" checked=\"\" disabled=\"\" /> 完了</li>\n</ul>\n"
    );
    assert_eq!(result["tree"], result["roundtripTree"]);
    assert_eq!(result["html"], result["roundtripHtml"]);
}

#[test]
fn 以前の保存形式の埋め草が消えても空のチェック状態と後続項目は残る() {
    let result = evaluate("- [ ] &#x20;\n- [x] 完了\n", true, None);
    assert_eq!(
        result["roundtripHtml"],
        "<ul>\n<li><input type=\"checkbox\" disabled=\"\" /> </li>\n<li><input type=\"checkbox\" checked=\"\" disabled=\"\" /> 完了</li>\n</ul>\n"
    );
}

#[test]
fn 文字として解析した行頭の空白をコードブロックへ変えない() {
    // ASTの手動変更や古い位置情報に依存しない、parse→format→parseだけの再現。
    let result = evaluate("&#32;&#32;&#32;&#32;行頭\n", false, None);
    assert_eq!(result["html"], "<p>    行頭</p>\n");
    assert_eq!(result["roundtripHtml"], result["html"]);
}
