import { AppRegistry } from "react-native";
import { name as appName } from "./app.json";
import CrossActivityController from "./src/screens/CrossActivity/Controller";

AppRegistry.registerComponent(appName, () => CrossActivityController);
AppRegistry.registerComponent(
  "TeleportController",
  () => CrossActivityController,
);
