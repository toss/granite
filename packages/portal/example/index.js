import { AppRegistry } from "react-native";
import CrossActivityController from "./src/screens/CrossActivity/Controller";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => CrossActivityController);
AppRegistry.registerComponent(
  "TeleportController",
  () => CrossActivityController,
);
