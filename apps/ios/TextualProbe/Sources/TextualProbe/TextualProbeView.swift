import Foundation
import SwiftUI
import Textual

struct TextualProbeView: View {
  var body: some View {
    StructuredText(
      markdown: "**太字** と _斜体_\n\n- 選択できる表示",
      baseURL: URL(string: "https://example.com/")
    )
    .textual.textSelection(.enabled)
  }
}
