use comrak::nodes::{Node, NodeValue};
use comrak::{Arena, Options, format_commonmark, format_html, parse_document};
use serde_json::{Value, json};
use std::ffi::{CString, c_char};

pub fn evaluate(source: &str, gfm: bool, replacement: Option<&str>) -> Value {
    let mut options = Options::default();
    options.extension.table = gfm;
    options.extension.strikethrough = gfm;
    options.extension.autolink = gfm;
    options.extension.tasklist = gfm;
    // 仕様全例には生HTMLと危険なURLも含む。検証文字列として比較するだけで表示しない。
    options.render.r#unsafe = true;
    let arena = Arena::new();
    let root = parse_document(&arena, source, &options);
    if let Some(replacement) = replacement {
        for node in root.descendants() {
            if let NodeValue::Text(text) = &mut node.data_mut().value {
                *text = replacement.to_owned().into();
                break;
            }
        }
    }
    let mut markdown = String::new();
    let mut html = String::new();
    format_commonmark(root, &options, &mut markdown).unwrap();
    format_html(root, &options, &mut html).unwrap();
    let reparsed_arena = Arena::new();
    let reparsed = parse_document(&reparsed_arena, &markdown, &options);
    let mut roundtrip_html = String::new();
    format_html(reparsed, &options, &mut roundtrip_html).unwrap();
    json!({
        "markdown": markdown, "html": html, "roundtripHtml": roundtrip_html,
        "tree": semantic_tree(root), "roundtripTree": semantic_tree(reparsed)
    })
}

// 比較専用。位置・フェンス・リストの記号は除き、画像の説明などHTMLで見えない構造も調べる。
fn semantic_tree(node: Node<'_>) -> Value {
    let data = node.data();
    let (kind, attributes) = match &data.value {
        NodeValue::CodeBlock(code) => ("codeBlock", json!([code.info, code.literal])),
        NodeValue::HtmlBlock(html) => ("htmlBlock", json!(html.literal)),
        NodeValue::Code(code) => ("code", json!(code.literal)),
        NodeValue::Heading(heading) => ("heading", json!(heading.level)),
        NodeValue::List(list) => (
            "list",
            json!([format!("{:?}", list.list_type), list.start, list.tight]),
        ),
        NodeValue::Item(_) => ("item", Value::Null),
        NodeValue::TaskItem(item) => ("taskItem", json!(item.symbol.is_some())),
        NodeValue::Table(table) => ("table", json!(format!("{:?}", table.alignments))),
        NodeValue::Link(link) => ("link", json!([link.url, link.title])),
        NodeValue::Image(image) => ("image", json!([image.url, image.title])),
        other => ("node", json!(format!("{other:?}"))),
    };
    json!([
        kind,
        attributes,
        node.children().map(semantic_tree).collect::<Vec<_>>()
    ])
}

/// Swiftからの検証用。成功時のJSONはevame_comrak_probe_freeで一度だけ解放する。
///
/// # Safety
/// sourceはsource_lenバイト読み取り可能で、呼び出し中有効なポインターであること。
/// replacementも同じ条件。NULLは置換なしを表し、その場合replacement_lenは0とする。
#[unsafe(no_mangle)]
pub unsafe extern "C" fn evame_comrak_probe(
    source: *const u8,
    source_len: usize,
    gfm: bool,
    replacement: *const u8,
    replacement_len: usize,
) -> *mut c_char {
    if source.is_null() || (replacement.is_null() && replacement_len != 0) {
        return std::ptr::null_mut();
    }
    std::panic::catch_unwind(|| {
        let source =
            std::str::from_utf8(unsafe { std::slice::from_raw_parts(source, source_len) }).ok()?;
        let replacement = if replacement.is_null() {
            None
        } else {
            Some(
                std::str::from_utf8(unsafe {
                    std::slice::from_raw_parts(replacement, replacement_len)
                })
                .ok()?,
            )
        };
        CString::new(evaluate(source, gfm, replacement).to_string())
            .ok()
            .map(CString::into_raw)
    })
    .ok()
    .flatten()
    .unwrap_or(std::ptr::null_mut())
}

/// # Safety
/// resultはevame_comrak_probeが返した未解放のポインター、またはNULLであること。
#[unsafe(no_mangle)]
pub unsafe extern "C" fn evame_comrak_probe_free(result: *mut c_char) {
    if !result.is_null() {
        drop(unsafe { CString::from_raw(result) });
    }
}
