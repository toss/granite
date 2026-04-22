import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "vitest";
import { ButtonTestScenario } from "./ButtonTestScenario";

describe("Button", () => {
	it("runs the rendered button onPress flow when a user presses it", () => {
		render(<ButtonTestScenario />);

		expect(screen.getByText("Pressed: 0")).toBeTruthy();

		fireEvent.press(screen.getByLabelText("Go to About Page"));

		expect(screen.getByText("Pressed: 1")).toBeTruthy();
	});
});
