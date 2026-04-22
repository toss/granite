import { fireEvent, render, screen } from "@testing-library/react-native";
import { TouchableOpacity } from "react-native";
import { describe, expect, it } from "vitest";
import { ButtonTestScenario } from "./ButtonTestScenario";

describe("Button", () => {
	it("runs the rendered button onPress flow when a user presses it", () => {
		const { UNSAFE_getByType } = render(<ButtonTestScenario />);

		expect(screen.getByText("Pressed: 0")).toBeTruthy();

		fireEvent.press(UNSAFE_getByType(TouchableOpacity));

		expect(screen.getByText("Pressed: 1")).toBeTruthy();
	});
});
