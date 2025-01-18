import type { Root } from "hast";
import React from "react";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import { type Plugin, unified } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { SourceTextAndTranslationSection } from "./sourceTextAndTranslationSection/SourceTextAndTranslationSection";
import * as prod from 'react/jsx-runtime'
import type { SourceTextWithTranslations } from "../types";

// 2) カスタムプラグイン
function pluginCustomTransform(): Plugin<[], Root> {
  // "attacher" → "transformer"
  return function attacher() {
    return function transformer(tree: Root, file: VFile) {
      // data-source-text-id → <source-text-section> に変換
      // a,img タグにクラス付与
      visit(tree, (node: any) => {
        if (node.type === "element") {
          if (node.tagName === "a") {
            node.properties = node.properties || {};
            if (!node.properties.className) node.properties.className = [];
            node.properties.className.push("underline", "underline-offset-4");
          }
          if (node.tagName === "img") {
            node.properties = node.properties || {};
            if (!node.properties.className) node.properties.className = [];
            node.properties.className.push("aspect-ratio-img", "max-w-full");
          }

          const dataId = node.properties?.dataSourceTextId;
          if (dataId) {
            console.log(dataId);
            node.tagName = "source-text-section";
            node.properties._sourceTextId = Number(dataId);
            node.properties.dataSourceTextId = undefined;
          }
        }
      });
    };
  };
}

// 3) HTML → ReactNode に変換する関数
export function convertHtmlToReact(html: string, sourceTextWithTranslation: SourceTextWithTranslations, showOriginal: boolean, showTranslation: boolean, currentUserName: string): React.ReactNode {
  // unifiedチェーン
  const { result } = unified()
    .use(rehypeParse, { fragment: true })
    .use(pluginCustomTransform())
    // @ts-expect-error
    .use(rehypeReact, {
      Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs,
          // Start of Selection
          createElement: React.createElement,
          components: {
            "source-text-section": (props: { children: React.ReactNode }) => {
              return (
                <SourceTextAndTranslationSection
                  sourceTextWithTranslations={sourceTextWithTranslation}
                  elements={props.children}
                  showOriginal={showOriginal}
                  showTranslation={showTranslation}
                  currentUserName={currentUserName}
                />
              );
            }
          }
      })
      .processSync(html);

  return result as React.ReactNode;
}
