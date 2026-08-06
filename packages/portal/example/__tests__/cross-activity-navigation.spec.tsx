import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler, DeviceEventEmitter, Linking } from "react-native";
import { PortalProvider } from "@granite-js/portal";

import CrossActivityController from "../src/screens/CrossActivity/Controller";

describe("cross-Activity navigation", () => {
  it("renders a distinct service home for each Activity host", () => {
    // Given a detached controller surface
    render(<CrossActivityController />);

    // When both Activity-owned portal destinations are unavailable
    // Then both unrelated service trees stay mounted in the controller
    expect(screen.UNSAFE_getByType(PortalProvider)).toBeOnTheScreen();
    expect(screen.getByTestId("store_service_home")).toBeOnTheScreen();
    expect(screen.getByTestId("wallet_service_home")).toBeOnTheScreen();
  });

  it("keeps the Wallet service home when the Store service opens a product", () => {
    // Given the Store and Wallet navigation trees
    render(<CrossActivityController />);

    // When the Store tree navigates
    fireEvent.press(screen.getByTestId("store_open_product"));

    // Then only the Store route changes
    expect(screen.getByTestId("store_product")).toBeOnTheScreen();
    expect(screen.getByTestId("wallet_service_home")).toBeOnTheScreen();
  });

  it("keeps the Store service home when the Wallet service opens a transfer", () => {
    // Given the Store and Wallet navigation trees
    render(<CrossActivityController />);

    // When the Wallet tree navigates
    fireEvent.press(screen.getByTestId("wallet_open_transfer"));

    // Then only the Wallet route changes
    expect(screen.getByTestId("wallet_transfer")).toBeOnTheScreen();
    expect(screen.getByTestId("store_service_home")).toBeOnTheScreen();
  });

  it("opens the Wallet native Activity from the Store RN tree through its scheme", () => {
    // Given the Store service is mounted in the main Activity
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue();
    render(<CrossActivityController />);

    // When Store RN requests the Wallet service
    fireEvent.press(screen.getByTestId("store_open_wallet"));

    // Then React Native delegates the Activity transition to Android linking
    expect(openURL).toHaveBeenCalledWith(
      "teleport-portal://cross-activity-secondary",
    );
    openURL.mockRestore();
  });

  it("pushes another MainActivity from the Store RN tree through its scheme", () => {
    // Given the Store service is mounted in a MainActivity
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue();
    render(<CrossActivityController />);

    // When Store RN requests another Store Activity
    fireEvent.press(screen.getByTestId("store_open_main_activity"));

    // Then React Native delegates a new MainActivity transition to Android
    expect(openURL).toHaveBeenCalledWith(
      "teleport-example://cross-activity/main",
    );
    openURL.mockRestore();
  });

  it("routes hardware back only to the navigation tree in the focused Activity", () => {
    type HardwareBackHandler = Parameters<
      typeof BackHandler.addEventListener
    >[1];
    let activityBackHandler: HardwareBackHandler | undefined;
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((_eventName, handler) => {
        activityBackHandler = handler;
        return { remove: jest.fn() };
      });
    const exitApp = jest.spyOn(BackHandler, "exitApp").mockImplementation();
    render(<CrossActivityController />);
    fireEvent.press(screen.getByTestId("store_open_product"));
    fireEvent.press(screen.getByTestId("wallet_open_transfer"));

    act(() => {
      DeviceEventEmitter.emit(
        "teleportActivityFocusChanged",
        "cross-activity-secondary",
      );
      activityBackHandler?.();
    });

    expect(screen.getByTestId("wallet_service_home")).toBeOnTheScreen();
    expect(screen.getByTestId("store_product")).toBeOnTheScreen();

    act(() => {
      activityBackHandler?.();
    });

    expect(exitApp).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("store_product")).toBeOnTheScreen();
  });
});
