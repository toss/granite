import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import * as PortalModule from "../index";
import { Portal } from "../index";

describe("native-owned portal contract", () => {
  it("exports only the native host portal components", () => {
    expect(Object.keys(PortalModule)).toEqual(["Portal"]);
  });

  it("renders content for a named native host", () => {
    render(
      <Portal hostName="store">
        <Text>Store service</Text>
      </Portal>,
    );

    expect(screen.getByText("Store service")).toBeOnTheScreen();
  });
});
