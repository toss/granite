import type { Context } from "react";
import type { ScrollViewContextValue } from "./contexts/ScrollViewContext/types";

declare global {
  interface Node {
    moveBefore(node: Node, child: Node | null): void;
  }
}

declare module "react-native" {
  namespace ScrollView {
    const Context: Context<ScrollViewContextValue>;
  }
}
