import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import * as PortalModule from "../index";
import { Portal, PortalProvider } from "../index";

describe("native-owned portal contract", () => {
  it("exports only the native host portal components", () => {
    expect(Object.keys(PortalModule).sort()).toEqual(["Portal", "PortalProvider"]);
  });

  it("renders content for a named native host", () => {
    render(
      <PortalProvider>
        <Portal hostName="store">
          <Text>Store service</Text>
        </Portal>
      </PortalProvider>,
    );

    expect(screen.getByText("Store service")).toBeOnTheScreen();
  });
});
