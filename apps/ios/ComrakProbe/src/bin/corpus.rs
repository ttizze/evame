use evame_comrak_probe::evaluate;
use serde_json::{Value, json};
use std::{env, fs, path::Path};

fn main() {
    let fixtures = env::args().nth(1).expect("fixture directory");
    let mut reports = Vec::new();
    for (name, expected_count, gfm) in [("commonmark-0.31.2", 652, false), ("gfm-0.29", 677, true)]
    {
        let data = fs::read(Path::new(&fixtures).join(format!("{name}.json"))).unwrap();
        let cases: Vec<Value> = serde_json::from_slice(&data).unwrap();
        assert_eq!(cases.len(), expected_count);
        for case in cases {
            let source = case["markdown"].as_str().unwrap();
            let result = evaluate(source, gfm, None);
            reports.push(json!({
                "corpus": name, "example": case["example"], "section": case["section"],
                "source": source, "expectedHtml": case["html"],
                "markdown": result["markdown"], "html": result["html"], "roundtripHtml": result["roundtripHtml"],
                "treeEqual": result["tree"] == result["roundtripTree"],
                "treeDifference": if result["tree"] == result["roundtripTree"] { Value::Null }
                    else { json!({"before": result["tree"], "after": result["roundtripTree"]}) }
            }));
        }
    }
    println!("{}", serde_json::to_string_pretty(&reports).unwrap());
}
