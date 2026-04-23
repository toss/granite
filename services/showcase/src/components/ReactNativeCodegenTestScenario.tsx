import { type ElementRef, type ReactNode , useRef, useState } from "react";
import { Text , codegenNativeCommands, codegenNativeComponent } from "react-native";
import { Button } from "./Button";

type GeneratedViewProps = {
	children?: ReactNode;
	testID?: string;
};

const GeneratedView =
	codegenNativeComponent<GeneratedViewProps>("GraniteCodegenView");
const commands = codegenNativeCommands<{
	play: (ref: unknown, source: string) => void;
}>({
	supportedCommands: ["play"],
});

export function ReactNativeCodegenTestScenario() {
	const generatedViewRef = useRef<ElementRef<typeof GeneratedView> | null>(
		null,
	);
	const [lastPlayedSource, setLastPlayedSource] = useState("none");
	const [refStatus, setRefStatus] = useState("missing");

	return (
		<>
			<GeneratedView ref={generatedViewRef} testID="codegen-native-view">
				Codegen Ready
			</GeneratedView>
			<Button
				label="Play intro"
				onPress={() => {
					commands.play(generatedViewRef.current, "intro.mp4");
					setLastPlayedSource("intro.mp4");
					setRefStatus(
						generatedViewRef.current == null ? "missing" : "attached",
					);
				}}
			/>
			<Text>Last played: {lastPlayedSource}</Text>
			<Text>Generated view ref: {refStatus}</Text>
		</>
	);
}
