import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import ScanScreen from './src/screens/ScanScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Recording: undefined;
  Scan: undefined;
  Result: {
    riskLevel: '高風險' | '中風險' | '低風險' | '資訊不足';
    finalScore: number;
    confidence: number;
    needHumanReview: boolean;
    evidenceHigh: string[];
    evidenceLow: string[];
    explanation: string;
    conclusion: string;
    debugInfo: {
      ocrPreview: string;
      ruleScore: number;
      aiScore: number;
      whitelistCap: number | null;
      confidence: number;
      finalScore: number;
      riskLevel: string;
    };
  };
  History: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Recording" component={RecordingScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
