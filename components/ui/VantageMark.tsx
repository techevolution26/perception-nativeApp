// components/ui/VantageMark.tsx
//
// Perception's signature mark, ported 1:1 from the web app's SVG — same
// geometry, same "shared center seen from three unequal angles" concept.
// react-native-svg's element API mirrors real SVG closely enough that this
// is nearly a copy-paste, just swapping <svg>/<circle>/<line> for their RN
// equivalents and camelCasing a couple of attributes.
import Svg, { Circle, Line } from "react-native-svg";
import { Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";

interface VantageMarkProps {
  size?: number;
  color?: string;
  spinning?: boolean;
  strokeWidth?: number;
}

export default function VantageMark({ size = 24, color = "#f2a33c", spinning = false, strokeWidth = 1.6 }: VantageMarkProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.bezier(0.5, 0, 0.5, 1),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const svg = (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx="12" cy="12" r="4.25" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="12" y1="1" x2="12" y2="5.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line
        x1="21.7" y1="15.1" x2="17.7" y2="13.6"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        rotation={2} originX={12} originY={12}
      />
      <Line x1="4.4" y1="18.9" x2="7.2" y2="15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );

  if (!spinning) return svg;

  return <Animated.View style={{ transform: [{ rotate }] }}>{svg}</Animated.View>;
}
