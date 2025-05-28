import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { margin, padding, type BoxSpacingPresets } from './box-spacing';

const properties = ['x', 'y', 'top', 'right', 'bottom', 'left'];
const units = [4, 8, 12, 16, 24, 32];

describe('padding', () => {
  it('can apply padding style by specifying top, right, bottom, left', () => {
    render(
      <View
        testID="view"
        style={padding({
          top: 8,
          right: 16,
          bottom: 24,
          left: 32,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      paddingTop: 8,
      paddingRight: 16,
      paddingBottom: 24,
      paddingLeft: 32,
    });
  });

  it('can apply padding style by specifying x, y', () => {
    render(
      <View
        testID="view"
        style={padding({
          x: 10,
          y: 5,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 5,
      paddingBottom: 5,
    });
  });

  it('can apply padding style by specifying top, bottom, x', () => {
    render(
      <View
        testID="view"
        style={padding({
          x: 10,
          top: 8,
          bottom: 24,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 8,
      paddingBottom: 24,
    });
  });

  it('can apply padding style by specifying left, right, y', () => {
    render(
      <View
        testID="view"
        style={padding({
          y: 10,
          right: 16,
          left: 32,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      paddingLeft: 32,
      paddingRight: 16,
      paddingTop: 10,
      paddingBottom: 10,
    });
  });

  it('can apply padding style using method', () => {
    render(<View testID="view" style={padding.x(10)} />);
    expect(screen.getByTestId('view')).toHaveStyle({
      paddingLeft: 10,
      paddingRight: 10,
    });
    expect(screen.getByTestId('view')).not.toHaveStyle({
      paddingTop: 10,
      paddingBottom: 10,
    });
  });

  it('when passing only a number to padding style, {padding:30} is applied', () => {
    render(<View testID="view" style={padding(30)} />);
    expect(screen.getByTestId('view')).toHaveStyle({
      padding: 30,
    });
  });

  it('presets exist', () => {
    for (const property of properties) {
      for (const unit of units) {
        const key = `${property}${unit}` as keyof BoxSpacingPresets;

        expect(padding[key]).not.toBeUndefined();
      }
    }
  });
});

describe('margin', () => {
  it('can apply margin style by specifying top, right, bottom, left', () => {
    render(
      <View
        testID="view"
        style={margin({
          top: 8,
          right: 16,
          bottom: 24,
          left: 32,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      marginTop: 8,
      marginRight: 16,
      marginBottom: 24,
      marginLeft: 32,
    });
  });

  it('can apply margin style by specifying x, y', () => {
    render(
      <View
        testID="view"
        style={margin({
          x: 10,
          y: 5,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      marginLeft: 10,
      marginRight: 10,
      marginTop: 5,
      marginBottom: 5,
    });
  });

  it('can apply margin style by specifying top, bottom, x', () => {
    render(
      <View
        testID="view"
        style={margin({
          x: 10,
          top: 8,
          bottom: 24,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      marginLeft: 10,
      marginRight: 10,
      marginTop: 8,
      marginBottom: 24,
    });
  });

  it('can apply margin style by specifying left, right, y', () => {
    render(
      <View
        testID="view"
        style={margin({
          y: 10,
          right: 16,
          left: 32,
        })}
      />
    );
    expect(screen.getByTestId('view')).toHaveStyle({
      marginLeft: 32,
      marginRight: 16,
      marginTop: 10,
      marginBottom: 10,
    });
  });

  it('can apply margin style using method', () => {
    render(<View testID="view" style={margin.x(10)} />);
    expect(screen.getByTestId('view')).toHaveStyle({
      marginLeft: 10,
      marginRight: 10,
    });
    expect(screen.getByTestId('view')).not.toHaveStyle({
      marginTop: 10,
      marginBottom: 10,
    });
  });

  it('when passing only a number to margin style, {margin:30} is applied', () => {
    render(<View testID="view" style={margin(30)} />);
    expect(screen.getByTestId('view')).toHaveStyle({
      margin: 30,
    });
  });

  it('presets exist', () => {
    for (const property of properties) {
      for (const unit of units) {
        const key = `${property}${unit}` as keyof BoxSpacingPresets;

        expect(margin[key]).not.toBeUndefined();
      }
    }
  });
});
