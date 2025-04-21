"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Tweet as XPost } from "react-tweet";

type XAttrs = { xId: string };

export default function XView({ node }: NodeViewProps) {
  // ① attrs から xId を取り出す
  const { xId } = node.attrs as XAttrs;

  return (
    <NodeViewWrapper data-type="x" data-x-id={xId} className="not-prose">
      {/* ② react‑tweet に ID を渡して描画 */}
      <XPost id={xId} />
    </NodeViewWrapper>
  );
}
