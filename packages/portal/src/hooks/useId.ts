import { useRef } from "react";

let idCounter = 0;

export default function useId(prefix = "uid"): string {
  const idRef = useRef<string>("");
  if (!idRef.current) {
    const n = ++idCounter;
    idRef.current = `${prefix}-${n}`;
  }
  return idRef.current;
}
