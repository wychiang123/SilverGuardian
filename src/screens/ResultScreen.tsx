import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface Props {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}

export default function ResultScreen({ navigation, route }: Props) {
  const { isSafe, message } = route.params;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isSafe) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.25,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
  }, [isSafe, blinkAnim]);

  if (isSafe) {
    return (
      <SafeAreaView style={[styles.container, styles.safeContainer]}>
        <StatusBar backgroundColor="#2e7d32" barStyle="light-content" />
        <View style={styles.content}>
          <Text style={styles.resultIcon}>✅</Text>
          <Text style={styles.safeTitle}>看起來安全</Text>
          <Text style={styles.messageText}>{message}</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeButtonText}>回到首頁</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, styles.dangerContainer]}>
      <StatusBar backgroundColor="#b71c1c" barStyle="light-content" />
      <Animated.View style={[styles.content, { opacity: blinkAnim }]}>
        <Text style={styles.resultIcon}>🚨</Text>
        <Text style={styles.dangerTitle}>這是詐騙！</Text>
        <Text style={styles.messageText}>{message}</Text>
        <View style={styles.notifyBox}>
          <Text style={styles.notifyText}>已通知家人</Text>
        </View>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>回到首頁</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeContainer: {
    backgroundColor: '#2e7d32',
  },
  dangerContainer: {
    backgroundColor: '#c62828',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  resultIcon: {
    fontSize: 100,
  },
  safeTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  dangerTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 26,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 38,
    opacity: 0.95,
  },
  notifyBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  notifyText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  homeButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 12,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
});
