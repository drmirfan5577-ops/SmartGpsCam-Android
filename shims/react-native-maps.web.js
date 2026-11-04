// Web placeholder for react-native-maps (native-only package).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

class MapView extends React.Component {
  animateToRegion() {}
  animateCamera() {}
  fitToCoordinates() {}
  fitToSuppliedMarkers() {}
  render() {
    return (
      <View style={[styles.container, this.props.style]}>
        <Text style={styles.text}>Map view is available in the mobile app.</Text>
      </View>
    );
  }
}

const Noop = () => null;

export const Marker = Noop;
export const Polyline = Noop;
export const Polygon = Noop;
export const Circle = Noop;
export const Callout = Noop;
export const PROVIDER_DEFAULT = undefined;
export const PROVIDER_GOOGLE = 'google';
export default MapView;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  text: { color: '#aaa', fontSize: 14 },
});
