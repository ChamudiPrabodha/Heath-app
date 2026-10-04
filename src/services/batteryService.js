// src/services/batteryService.js - Battery monitoring with safe fallbacks
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';

export async function getBatteryStatus() {
  try {
    if (Platform.OS === 'web') {
      if ('getBattery' in navigator) {
        const navBattery = await navigator.getBattery();
        return {
          batteryLevel: Math.round(navBattery.level * 100),
          isCharging: navBattery.charging,
        };
      }
      return { batteryLevel: 85, isCharging: false };
    }

    const level = await Battery.getBatteryLevelAsync();
    const batteryState = await Battery.getBatteryStateAsync();
    const isCharging =
      batteryState === Battery.BatteryState.CHARGING ||
      batteryState === Battery.BatteryState.FULL;

    const batteryPercentage = level >= 0 ? Math.round(level * 100) : 88;
    return {
      batteryLevel: batteryPercentage,
      isCharging,
    };
  } catch (err) {
    // Return sensible fallback if simulator or permission error
    return { batteryLevel: 85, isCharging: false };
  }
}
