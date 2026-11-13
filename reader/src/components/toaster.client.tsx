import { createRoot, type Root } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { getReaderTheme, subscribeReaderTheme } from "../theme.client";

let users = 0;
let active: {
	root: Root;
	container: HTMLDivElement;
	unsubscribe: () => void;
} | null = null;

export function acquireToaster() {
	users++;
	if (!active) {
		const container = document.createElement("div");
		container.dataset.readerToaster = "";
		document.body.append(container);
		const root = createRoot(container);
		const render = () => {
			if (container.isConnected)
				root.render(
					<Toaster closeButton richColors theme={getReaderTheme()} />,
				);
		};
		const unsubscribe = subscribeReaderTheme(render);
		active = { root, container, unsubscribe };
		render();
	}
	return () => {
		users--;
		queueMicrotask(() => {
			if (users !== 0 || !active) return;
			active.unsubscribe();
			active.root.unmount();
			active.container.remove();
			active = null;
		});
	};
}
