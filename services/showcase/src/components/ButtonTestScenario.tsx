import { useState } from "react";
import { Text } from "react-native";
import { Button } from "./Button";

export function ButtonTestScenario() {
	const [pressCount, setPressCount] = useState(0);

	return (
		<>
			<Button
				label="Go to About Page"
				onPress={() => setPressCount((currentCount) => currentCount + 1)}
			/>
			<Text>Pressed: {pressCount}</Text>
		</>
	);
}
