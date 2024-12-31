//©tbsvsn. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TIME_INTERVALS = [
  3, 30, 45,
  60, 90, 120, 150, 180
];

const NOTIFICATION_TIMES = [
  { minutes: 5, message: "Noch 5 Minuten Parkzeit übrig!" },
  { minutes: 3, message: "Noch 3 Minuten Parkzeit übrig!" },
  { minutes: 1, message: "Noch 1 Minute Parkzeit übrig!" }
];

export default function ParkingMeter() {
  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [endTime, setEndTime] = useState(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    let interval;
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(time => {
          if (time <= 1) {
            clearInterval(interval);
            setIsActive(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, remainingTime]);

  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Notifications permission not granted');
    }
  };

  const scheduleNotification = async (title, body, date) => {
    
    const trigger = date;
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger,
    });
    
    return identifier;
  };

  const startTimer = async () => {
    if (!selectedMinutes) return;
    
    try {
      // Cancel any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Calculate end time
      const now = new Date();
      const end = new Date(now.getTime() + selectedMinutes * 60000);
      setEndTime(end);
      
      // Start the timer
      const totalSeconds = selectedMinutes * 60;
      setRemainingTime(totalSeconds);
      setIsActive(true);

      // Schedule warning notifications based on absolute times
      for (const { minutes, message } of NOTIFICATION_TIMES) {
        if (selectedMinutes > minutes) {
          const notificationTime = new Date(end.getTime() - (minutes * 60000));
          if (notificationTime > now) {
            await scheduleNotification(
              'Parkzeit Warnung',
              message,
              notificationTime
            );
          }
        }
      }

      // Schedule final notification
      await scheduleNotification(
        'Parkzeit abgelaufen!',
        'Ihre Parkzeit ist jetzt abgelaufen.',
        end
      );

    } catch (error) {
      console.error('Error starting timer:', error);
      alert('Fehler beim Starten des Timers');
    }
  };

  const stopTimer = async () => {
    setIsActive(false);
    setRemainingTime(0);
    setSelectedMinutes(null);
    setEndTime(null);
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} Minuten`;
    }
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  };

  const formatDateTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.timeInfo}>
          <View style={styles.timeInfoItem}>
            <Text style={styles.timeLabel}>Aktuelle Zeit:</Text>
            <Text style={styles.timeValue}>{formatDateTime(currentTime)}</Text>
          </View>
          <View style={styles.timeInfoItem}>
            <Text style={styles.timeLabel}>Endzeit:</Text>
            <Text style={styles.timeValue}>{formatDateTime(endTime)}</Text>
          </View>
        </View>

        <View style={styles.display}>
          <Text style={styles.timeText}>
            {formatTime(remainingTime)}
          </Text>
        </View>

        <ScrollView style={styles.timeSelector} showsVerticalScrollIndicator={false}>
          {TIME_INTERVALS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.timeOption,
                selectedMinutes === minutes && styles.selectedTimeOption
              ]}
              onPress={() => !isActive && setSelectedMinutes(minutes)}
            >
              <Text style={[
                styles.timeOptionText,
                selectedMinutes === minutes && styles.selectedTimeOptionText
              ]}>
                {formatDuration(minutes)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.button, 
            (!selectedMinutes || isActive) && styles.buttonDisabled
          ]}
          onPress={startTimer}
          disabled={!selectedMinutes || isActive || remainingTime > 0}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>

        {isActive && (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopTimer}
          >
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
  },
  timeInfoItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  display: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000',
  },
  timeSelector: {
    maxHeight: 200,
    marginBottom: 20,
  },
  timeOption: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    backgroundColor: 'transparent',
  },
  selectedTimeOption: {
    backgroundColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#000',
  },
  selectedTimeOptionText: {
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  stopButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});