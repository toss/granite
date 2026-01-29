import { StatusBar, Stack, Spacing, createRoute, type StatusBarStyle } from '@granite-js/react-native';
import { Button } from 'components/Button';
import { Checkbox } from 'components/Checkbox';
import { useState, useEffect } from 'react';
import { Appearance, ScrollView, Text, type ColorSchemeName } from 'react-native';

export const Route = createRoute('/showcase/status-bar', {
  validateParams: (params) => params,
  component: ShowcaseStatusBar,
});

function ShowcaseStatusBar() {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');
  const [style, setStyle] = useState<StatusBarStyle>('auto');
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);
  const [translucent, setTranslucent] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [networkActivityIndicatorVisible, setNetworkActivityIndicatorVisible] = useState(false);

  useEffect(() => {
    const subscription = Appearance.addChangeListener((preference) => {
      setColorScheme(preference.colorScheme);
    });

    return () => subscription.remove();
  }, []);

  return (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: colorScheme === 'dark' ? '#333' : '#fff' }}>
      <StatusBar
        style={style}
        animated={animated}
        hidden={hidden}
        backgroundColor={backgroundColor}
        translucent={translucent}
      />
      <Stack.Vertical gutter={16}>
        <Text>Style</Text>
        <ScrollView horizontal>
          <Stack.Horizontal gutter={16}>
            <Button onPress={() => setStyle('auto')} label="auto" />
            <Button onPress={() => setStyle('light')} label="light" />
            <Button onPress={() => setStyle('dark')} label="dark" />
            <Button onPress={() => setStyle('inverted')} label="inverted" />
          </Stack.Horizontal>
        </ScrollView>

        <Text>Animated</Text>
        <Stack.Horizontal gutter={16}>
          <Checkbox checked={animated} onPress={() => setAnimated((value) => !value)} />
        </Stack.Horizontal>

        <Text>Hidden</Text>
        <Stack.Horizontal gutter={16}>
          <Checkbox checked={hidden} onPress={() => setHidden((value) => !value)} />
        </Stack.Horizontal>

        <Text>BackgroundColor (Android only)</Text>
        <ScrollView horizontal>
          <Stack.Horizontal gutter={16}>
            <Button onPress={() => setBackgroundColor('#f44336')} label="Red" />
            <Button onPress={() => setBackgroundColor('#4caf50')} label="Green" />
            <Button onPress={() => setBackgroundColor('#2196f3')} label="Blue" />
            <Button onPress={() => setBackgroundColor(undefined)} label="Reset" />
          </Stack.Horizontal>
        </ScrollView>

        <Text>Translucent (Android only)</Text>
        <Stack.Horizontal gutter={16}>
          <Checkbox checked={translucent} onPress={() => setTranslucent((value) => !value)} />
        </Stack.Horizontal>

        <Text>Show network activity indicator (iOS only)</Text>
        <Stack.Horizontal gutter={16}>
          <Checkbox
            checked={networkActivityIndicatorVisible}
            onPress={() => setNetworkActivityIndicatorVisible((value) => !value)}
          />
        </Stack.Horizontal>
      </Stack.Vertical>
      <Spacing size={50} />
    </ScrollView>
  );
}
