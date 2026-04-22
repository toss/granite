import { fireEvent, render, screen } from "@testing-library/react-native";
import { TouchableOpacity } from "react-native";
import { describe, expect, it } from "vitest";
import { ReactNativeCodegenTestScenario } from "./ReactNativeCodegenTestScenario";

describe("react-native codegen helpers", () => {
	it("dispatches generated native commands when a rendered button triggers them", () => {
		const { UNSAFE_getByType } = render(<ReactNativeCodegenTestScenario />);

		expect(screen.getByTestId("codegen-native-view")).toBeTruthy();
		expect(screen.getByText("Last played: none")).toBeTruthy();
		expect(screen.getByText("Generated view ref: missing")).toBeTruthy();

		fireEvent.press(UNSAFE_getByType(TouchableOpacity));

		expect(screen.getByText("Last played: intro.mp4")).toBeTruthy();
		expect(screen.getByText("Generated view ref: attached")).toBeTruthy();
	});
});
