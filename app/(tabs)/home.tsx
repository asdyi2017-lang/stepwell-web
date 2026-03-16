import { Activity, AlertTriangle, Droplets, HeartPulse, Stethoscope, LogOut, Watch, WifiOff, Pencil, MessageCircle, Send, Download, Sun, Footprints, Flame, Zap, Award, BarChart2, X, Share2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert, Modal, TextInput, Share, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiMe, BASE_URL, getHealthSnapshot, updateHealthSnapshot, apiAskAssistant } from "../../lib/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

type Level = 'normal' | 'warning' | 'critical';
type DeviceStatus = 'ok' | 'offline' | 'faulty';
type Page = 'dashboard' | 'alerts' | 'devices' | 'statistics' | 'achievements' | 'doctor' | 'assistant';

const colors = {
  bg: '#F8FAFC',
  teal: '#1E6F78',
  tealSoft: '#E8F3F4',
  text: '#20363A',
  muted: '#6A8085',
  border: '#E8EEF2',

  warnBg: '#FFF7E6',
  warnBorder: '#F1D7A4',
  warn: '#B26A00',

  critBg: '#FFE8EC',
  critBorder: '#F1A6B3',
  crit: '#B00020',

  okBg: '#EAF6F7',
  okBorder: '#D6ECEE',
  ok: '#1E6F78',

  normBg: '#E8F7EC',
  normBorder: '#BFE7C9',
  norm: '#2E7D32',
};

const MILESTONES = [
  { id: '10k', title: '10K Steps', req: 10000, img: require('../../assets/images/10K_Ach.png'), desc: "You've taken your first 10,000 steps! A great start to a healthier lifestyle." },
  { id: '100k', title: '100K Steps', req: 100000, img: require('../../assets/images/100K_Ach.png'), desc: "100,000 steps! You're building a solid and consistent walking habit." },
  { id: '200k', title: '200K Steps', req: 200000, img: require('../../assets/images/200K_Ach.png'), desc: "200,000 steps! Keep the momentum going, you are unstoppable." },
  { id: '500k', title: '500K Steps', req: 500000, img: require('../../assets/images/500K_Ach.png'), desc: "Half a million steps! You are officially a walking machine." },
  { id: '1m', title: '1M Steps', req: 1000000, img: require('../../assets/images/1M_Ach.png'), desc: "ONE MILLION STEPS! An incredible milestone. You are a StepWell legend." },
];

function levelColor(l: Level) {
  return l === 'critical' ? colors.crit : l === 'warning' ? colors.warn : colors.norm;
}
function levelPillStyle(l: Level) {
  return { borderColor: levelColor(l), color: levelColor(l) };
}
function levelCardStyle(l: Level) {
  if (l === 'critical') return { backgroundColor: colors.critBg, borderColor: colors.critBorder };
  if (l === 'warning') return { backgroundColor: colors.warnBg, borderColor: colors.warnBorder };
  return { backgroundColor: colors.normBg, borderColor: colors.normBorder };
}
function devicePillStyle(s: DeviceStatus) {
  if (s === 'offline') return { backgroundColor: colors.warnBg, borderColor: colors.warnBorder, color: colors.warn };
  if (s === 'faulty') return { backgroundColor: colors.critBg, borderColor: colors.critBorder, color: colors.crit };
  return { backgroundColor: colors.okBg, borderColor: colors.okBorder, color: colors.ok };
}
function deviceLabel(s: DeviceStatus) {
  if (s === 'offline') return 'OFFLINE';
  if (s === 'faulty') return 'FAULT';
  return 'OK';
}

export default function Home() {

  const { width } = useWindowDimensions();
  
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [page, setPage] = useState<Page>('dashboard');

  const [user, setUser] = useState<any>(null);
  const [rawSnapshot, setRawSnapshot] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  
  const [statistics, setStatistics] = useState<any[]>([]);
  const [editModal, setEditModal] = useState({ visible: false, title: '', value: '' });

  const [achModal, setAchModal] = useState<{ visible: boolean; data: any | null }>({ visible: false, data: null });

  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [weather, setWeather] = useState<{temp: number} | null>(null);
  const [faultedDevice, setFaultedDevice] = useState<string | null>(null);

  const currentRole = user?.role || 'patient';

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (currentRole === 'patient') {
      fetch(`${BASE_URL}/weather`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current_weather) {
            setWeather({ temp: data.current_weather.temperature });
          }
        })
        .catch(err => {
          console.log("Weather fetch error:", err);
          setWeather({ temp: 18 });
        });
    }
  }, [currentRole]);

  async function load() {
    try {
      const me = await apiMe();
      const normalizedUser = me?.user || me;
      setUser(normalizedUser);

      if (normalizedUser.role === 'doctor') {
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(`${BASE_URL}/users?role=patient`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Patients request failed");
        const data = await res.json();
        setPatients(data);
        
        if (data && data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } else {
        setSelectedPatientId(normalizedUser.id);
      }
    } catch (err) {
      console.log("LOAD ERROR:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedPatientId) {
      loadSnapshot(selectedPatientId);
      loadStatistics(selectedPatientId);
    }
  }, [selectedPatientId]);

  async function loadSnapshot(id: number) {
    try {
      const data = await getHealthSnapshot(id);
      const snapshotData = Array.isArray(data) ? data[0] : data;
      setRawSnapshot(snapshotData);
    } catch (err) {
      console.log("SNAPSHOT ERROR:", err);
      setRawSnapshot(null); 
    }
  }

  async function loadStatistics(id: number) {
    try {
      const res = await fetch(`${BASE_URL}/health/statistics/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (err) {
      console.log("STATISTICS ERROR:", err);
    }
  }

  async function handleSaveEdit() {
    if (!selectedPatientId) return;

    let payload: any = {};
    const val = editModal.value;

    if (editModal.title === 'Blood Pressure') {
      const parts = val.split('/'); 
      payload.systolic_bp = Number(parts[0]);
      payload.diastolic_bp = Number(parts[1]);
    } else if (editModal.title === 'Blood Glucose') {
      payload.blood_glucose = Number(val);
    } else if (editModal.title === 'SpO₂') {
      payload.spo2 = Number(val);
    } else if (editModal.title === 'Heart Rate') {
      payload.heart_rate = Number(val);
    } else if (editModal.title === 'Weight') {
      payload.weight = Number(val);
    } else if (editModal.title === 'Steps') {
      const stepsValue = Number(val);
      if (stepsValue > 60000) {
        Alert.alert("Limit Exceeded", "You cannot log more than 60,000 steps in a single day.");
        return;
      }
      if (stepsValue < 0) {
        Alert.alert("Invalid Input", "Steps cannot be a negative number.");
        return;
      }
      payload.steps = stepsValue;
    } else if (editModal.title === 'Streak') {
      payload.streak = Number(val);
    }

    try {
      await updateHealthSnapshot(selectedPatientId, payload);
      setEditModal({ visible: false, title: '', value: '' });
      loadSnapshot(selectedPatientId); 
      loadStatistics(selectedPatientId);
      load(); 
    } catch (err) {
      console.log("Edit error:", err);
      Alert.alert("Error", "Failed to save changes.");
    }
  }

  async function handleSendMessage() {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const metricsToSend = snapshot ? {
        bp: snapshot.bp, glucose: snapshot.glucose, spo2: snapshot.spo2, hr: snapshot.hr, weight: snapshot.weight,
        activity: snapshot.activity,
        weather: weather ? `${weather.temp}°C` : 'unknown'
      } : null;

      const data = await apiAskAssistant(userText, metricsToSend);
      
      if (data && data.text) {
        setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, an error occurred." }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Error connecting to AI server." }]);
    } finally {
      setIsTyping(false);
    }
  }

  const selectedPatient = useMemo(() => {
    if (currentRole !== 'doctor' || !selectedPatientId) return null;
    return patients.find(p => p.id === selectedPatientId);
  }, [selectedPatientId, patients, currentRole]);

  const downloadReport = () => {
    const targetUser = currentRole === 'doctor' ? selectedPatient : user;

    if (!snapshot || !targetUser) {
      Alert.alert("Notice", "Data is not ready to be exported.");
      return;
    }

    const firstName = targetUser.first_name || targetUser.firstName || "Unknown";
    const lastName = targetUser.last_name || targetUser.lastName || "Patient";

    const reportText = `
STEPWELL MEDICAL REPORT
-------------------------
Patient: ${firstName} ${lastName}
Date: ${new Date().toLocaleString()}

CURRENT METRICS:
- Blood Pressure: ${snapshot.bp.sys}/${snapshot.bp.dia} mmHg (${snapshot.bp.status.toUpperCase()})
- Blood Glucose: ${snapshot.glucose.value} mmol/L (${snapshot.glucose.status.toUpperCase()})
- SpO2: ${snapshot.spo2.value}% (${snapshot.spo2.status.toUpperCase()})
- Heart Rate: ${snapshot.hr.value} bpm (${snapshot.hr.status.toUpperCase()})
- Weight: ${snapshot.weight.value} kg (BMI: ${snapshot.weight.bmi > 0 ? snapshot.weight.bmi : '-'})

ACTIVITY:
- Steps: ${snapshot.activity.steps}
- Calories: ${snapshot.activity.calories} kcal
- Streak: ${snapshot.activity.streak} days

ALERTS:
${snapshot.alerts.length > 0 
  ? snapshot.alerts.map((a: any) => `- [${a.level.toUpperCase()}] ${a.title}: ${a.text}`).join('\n')
  : 'No active alerts.'
}
-------------------------
Generated by StepWell System
    `.trim();

    if (Platform.OS === 'web') {
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Patient_Report_${targetUser.id || 'export'}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert("Report Generated", "Data is ready. Mobile version requires a share module.");
      console.log(reportText);
    }
  };

  const snapshot = useMemo(() => {
    if (!rawSnapshot || Object.keys(rawSnapshot).length === 0 || rawSnapshot.message) return null;

    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const bp = { 
      sys: Number(rawSnapshot.systolic ?? rawSnapshot.systolic_bp) || null,
      dia: Number(rawSnapshot.diastolic ?? rawSnapshot.diastolic_bp) || null,
      pulse: Number(rawSnapshot.heart_rate ?? rawSnapshot.pulse) || null,
      updatedAt: currentTime,
      deviceStatus: 'ok' as DeviceStatus 
    };

    const glucose = { 
      value: Number(rawSnapshot.glucose ?? rawSnapshot.blood_glucose) || null,
      unit: 'mmol/L',
      updatedAt: currentTime,
      deviceStatus: 'ok' as DeviceStatus 
    };

    const spo2 = { 
      value: Number(rawSnapshot.spo2) || null,
      unit: '%',
      updatedAt: currentTime,
      deviceStatus: 'ok' as DeviceStatus 
    };

    const hr = { 
      value: Number(rawSnapshot.heart_rate) || null,
      unit: 'bpm',
      updatedAt: currentTime,
      deviceStatus: 'ok' as DeviceStatus 
    };

    const wValue = Number(rawSnapshot.weight) || null;
    let bmiValue = 0;
    
    const targetUser = currentRole === 'doctor' ? selectedPatient : user;
    const hValue = Number(rawSnapshot.height) || (targetUser && targetUser.height ? Number(targetUser.height) : 0);

    if (wValue && hValue > 0) {
        const heightInMeters = hValue / 100;
        bmiValue = Number((wValue / (heightInMeters * heightInMeters)).toFixed(1));
    }

    const weight = { 
      value: wValue,
      unit: 'kg',
      bmi: bmiValue, 
      updatedAt: currentTime,
      deviceStatus: 'ok' as DeviceStatus 
    };

    let stepsCount = rawSnapshot.steps != null ? Number(rawSnapshot.steps) : 0;
    let streakDays = rawSnapshot.streak != null ? Number(rawSnapshot.streak) : 0;

    if (faultedDevice === 'd1') {
      bp.sys = 240; bp.dia = 160; bp.deviceStatus = 'faulty';
      stepsCount = 1000000;
    } else if (faultedDevice === 'd2') {
      spo2.value = 55; spo2.deviceStatus = 'faulty';
    } else if (faultedDevice === 'd3') {
      glucose.value = 28; glucose.deviceStatus = 'faulty';
    } else if (faultedDevice === 'd4') {
      hr.value = 220; hr.deviceStatus = 'faulty';
    }

    const caloriesBurned = Math.floor(stepsCount * 0.045);

    const activity = {
      steps: stepsCount,
      streak: streakDays,
      calories: caloriesBurned
    };

    const bpStatus: Level = evalBP(bp);
    const glucoseStatus: Level = evalGlucose(glucose);
    const spo2Status: Level = evalSpO2(spo2);
    const hrStatus: Level = evalHR(hr);
    const weightStatus: Level = evalWeight(weight); 

    const alerts = buildAlerts({ bp, glucose, spo2, hr, activity, weight }, { bpStatus, glucoseStatus, spo2Status, hrStatus, weightStatus });

    return {
      bp: { ...bp, status: bpStatus },
      glucose: { ...glucose, status: glucoseStatus },
      spo2: { ...spo2, status: spo2Status },
      hr: { ...hr, status: hrStatus },
      weight: { ...weight, status: weightStatus }, 
      activity,
      alerts,
      devices: [
        { id: 'd1', name: 'Smart Watch', status: bp.deviceStatus, lastSeen: bp.updatedAt },
        { id: 'd2', name: 'Pulse Oximeter', status: spo2.deviceStatus, lastSeen: spo2.updatedAt },
        { id: 'd3', name: 'Glucose Monitor', status: glucose.deviceStatus, lastSeen: glucose.updatedAt },
        { id: 'd4', name: 'HR Strap', status: hr.deviceStatus, lastSeen: hr.updatedAt },
      ],
    };
  }, [rawSnapshot, faultedDevice, selectedPatient, user]);

  const totalLifetimeSteps = useMemo(() => {
    let sum = 0;
    if (statistics && statistics.length > 0) {
      sum = statistics.reduce((acc, curr) => acc + (Number(curr.steps) || 0), 0);
    }
    if (faultedDevice === 'd1') {
      sum += 1000000;
    }
    return sum;
  }, [statistics, faultedDevice]);

  const handleShareAchievement = async (title: string) => {
    try {
      await Share.share({
        message: `I just unlocked the "${title}" achievement on StepWell! It's time to build a healthier lifestyle. Join me!`,
      });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

  const handleAchievementPress = (milestone: any) => {
    if (totalLifetimeSteps >= milestone.req) {
      setAchModal({ visible: true, data: milestone });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>No user data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const topAlert = snapshot?.alerts[0];

  const NavButton = ({ active, label, icon, onPress }: any) => (
    <Pressable onPress={onPress} style={[styles.navItem, active && styles.navItemActive]}>
      <View style={styles.navIcon}>{icon}</View>
      <Text style={styles.navText}>{label}</Text>
    </Pressable>
  );

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('userToken'); 
      router.replace('/login'); 
    } catch (err) {
      console.log("LOGOUT ERROR:", err);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {isDesktop && (
          <View style={styles.sidebar}>
            <View style={styles.brandContainer}>
              <Image 
                source={require('../../assets/images/LogoStepWell.png')} 
                style={styles.logoImage} 
              />
              <View>
                <Text style={styles.brand}>StepWell</Text>
                <Text style={styles.brandSub}>Virtual Companion</Text>
              </View>
            </View>

            <View style={{ height: 18 }} />

            <NavButton
              active={page === 'dashboard'}
              label="Dashboard"
              icon={<Activity size={18} color={colors.teal} strokeWidth={2.5} />}
              onPress={() => setPage('dashboard')}
            />
            <NavButton
              active={page === 'alerts'}
              label="Alerts"
              icon={<AlertTriangle size={18} color={colors.teal} strokeWidth={2.5} />}
              onPress={() => setPage('alerts')}
            />
            <NavButton
              active={page === 'devices'}
              label="Devices"
              icon={<Watch size={18} color={colors.teal} strokeWidth={2.5} />}
              onPress={() => setPage('devices')}
            />
            
            {currentRole !== 'doctor' && (
              <>
                <NavButton
                  active={page === 'statistics'}
                  label="Statistics"
                  icon={<BarChart2 size={18} color={colors.teal} strokeWidth={2.5} />}
                  onPress={() => setPage('statistics')}
                />
                <NavButton
                  active={page === 'achievements'}
                  label="Achievements"
                  icon={<Award size={18} color={colors.teal} strokeWidth={2.5} />}
                  onPress={() => setPage('achievements')}
                />
              </>
            )}

            <NavButton
              active={page === 'assistant'}
              label="AI Assistant"
              icon={<MessageCircle size={18} color={colors.teal} strokeWidth={2.5} />}
              onPress={() => setPage('assistant')}
            />
            {currentRole === 'doctor' && (
              <NavButton
                active={page === 'doctor'}
                label="Patients List"
                icon={<Stethoscope size={18} color={colors.teal} strokeWidth={2.5} />}
                onPress={() => setPage('doctor')}
              />
            )}

            <View style={{ flex: 1 }} />

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Live data from DB</Text>
              <Text style={styles.noticeText}>Rule-based alerts • Not medical advice</Text>
            </View>
          </View>
        )}

        <View style={styles.main}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle} numberOfLines={1}>
                {page === 'doctor' && currentRole === 'doctor' ? 'Patients Directory' : 
                 currentRole === 'doctor' && selectedPatient ? `Patient: ${selectedPatient.first_name}` :
                 `Welcome back, ${user?.first_name || 'User'}!`}
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
                <Text style={styles.hSub}>
                  {currentRole === 'doctor' ? 'Healthcare provider view' : 'Today summary • alerts'}
                </Text>
                {currentRole === 'doctor' && selectedPatientId && (
                  <Pressable onPress={downloadReport} style={styles.downloadIconBtn}>
                    <Download size={14} color={colors.teal} />
                    <Text style={{fontSize: 10, fontWeight: '700', color: colors.teal}}>Export Report</Text>
                  </Pressable>
                )}
                {currentRole !== 'doctor' && snapshot && (
                  <Pressable onPress={downloadReport} style={styles.downloadIconBtn}>
                    <Download size={14} color={colors.teal} />
                    <Text style={{fontSize: 10, fontWeight: '700', color: colors.teal}}>Export My Data</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={[styles.avatarWrap, {marginLeft: 10}]}>
              <Image source={{ uri: "https://avatars.mds.yandex.net/get-yapic/69015/3vULTgBvet3oDps8eGudxrUec-1/orig" }} style={styles.avatar} />
              {snapshot?.alerts.some((a: any) => a.level === 'critical') && <View style={styles.dot} />}
            </View>

            <Pressable 
              onPress={handleLogout} 
              style={{ padding: 8, marginLeft: 5 }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <LogOut size={24} color={colors.teal} />
            </Pressable>
          </View>

          {!isDesktop && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }}>
              <View style={styles.mobileTabs}>
                <Pressable onPress={() => setPage('dashboard')} style={[styles.mTab, page === 'dashboard' && styles.mTabOn]}>
                  <Text style={[styles.mTabText, page === 'dashboard' && styles.mTabTextOn]}>Dash</Text>
                </Pressable>
                <Pressable onPress={() => setPage('alerts')} style={[styles.mTab, page === 'alerts' && styles.mTabOn]}>
                  <Text style={[styles.mTabText, page === 'alerts' && styles.mTabTextOn]}>Alerts</Text>
                </Pressable>
                <Pressable onPress={() => setPage('devices')} style={[styles.mTab, page === 'devices' && styles.mTabOn]}>
                  <Text style={[styles.mTabText, page === 'devices' && styles.mTabTextOn]}>Devices</Text>
                </Pressable>
                
                {currentRole !== 'doctor' && (
                  <>
                    <Pressable onPress={() => setPage('statistics')} style={[styles.mTab, page === 'statistics' && styles.mTabOn]}>
                      <Text style={[styles.mTabText, page === 'statistics' && styles.mTabTextOn]}>Stats</Text>
                    </Pressable>
                    <Pressable onPress={() => setPage('achievements')} style={[styles.mTab, page === 'achievements' && styles.mTabOn]}>
                      <Text style={[styles.mTabText, page === 'achievements' && styles.mTabTextOn]}>Rewards</Text>
                    </Pressable>
                  </>
                )}
                
                <Pressable onPress={() => setPage('assistant')} style={[styles.mTab, page === 'assistant' && styles.mTabOn]}>
                  <Text style={[styles.mTabText, page === 'assistant' && styles.mTabTextOn]}>AI</Text>
                </Pressable>
                {currentRole === 'doctor' && (
                  <Pressable onPress={() => setPage('doctor')} style={[styles.mTab, page === 'doctor' && styles.mTabOn]}>
                    <Text style={[styles.mTabText, page === 'doctor' && styles.mTabTextOn]}>Patients</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          )}

          {page === 'assistant' ? (
            <View style={styles.chatContainer}>
              <ScrollView contentContainerStyle={styles.chatList}>
                {chatHistory.length === 0 && (
                  <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                    <MessageCircle size={48} color={colors.teal} />
                    <Text style={{ marginTop: 10, fontSize: 16, fontWeight: '800', color: colors.teal, textAlign: 'center' }}>
                      I am your StepWell AI Assistant.{'\n'}Ask me about your health metrics!
                    </Text>
                  </View>
                )}
                {chatHistory.map((msg, i) => (
                  <View key={i} style={[styles.chatBubble, msg.role === 'user' ? styles.chatUser : styles.chatAi]}>
                    <Text style={msg.role === 'user' ? styles.chatTextUser : styles.chatTextAi}>{msg.text}</Text>
                  </View>
                ))}
                {isTyping && (
                  <View style={[styles.chatBubble, styles.chatAi]}>
                    <Text style={styles.chatTextAi}>Analyzing data...</Text>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.chatInputArea}>
                <TextInput 
                  style={styles.chatInput} 
                  placeholder="Ask a question..." 
                  placeholderTextColor={colors.muted} 
                  value={chatInput} 
                  onChangeText={setChatInput} 
                  onSubmitEditing={handleSendMessage} 
                />
                <Pressable style={styles.chatSendBtn} onPress={handleSendMessage}>
                  <Send size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              
              {page === 'dashboard' && currentRole === 'doctor' && patients.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.smallLabel, { marginBottom: 0 }]}>SELECT PATIENT:</Text>
                    {selectedPatient && snapshot && (
                      <Pressable onPress={downloadReport} style={styles.downloadBtn}>
                        <Download size={14} color={colors.teal} />
                        <Text style={styles.downloadBtnText}>Export Report</Text>
                      </Pressable>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {patients.map(p => (
                      <Pressable
                        key={p.id}
                        onPress={() => setSelectedPatientId(p.id)}
                        style={[styles.chip, selectedPatientId === p.id && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, selectedPatientId === p.id && styles.chipTextOn]}>
                          {p.first_name} {p.last_name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {page === 'dashboard' && topAlert && (
                <Pressable style={[styles.banner, topAlert.level === 'critical' ? styles.bannerCrit : styles.bannerWarn]} onPress={() => setPage('alerts')}>
                  <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                    <AlertTriangle size={18} color={topAlert.level === 'critical' ? colors.crit : colors.warn} strokeWidth={2.5} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bannerTitle}>
                        {topAlert.level === 'critical' ? 'Critical alert' : 'Health alert'} • {topAlert.time}
                      </Text>
                      <Text style={styles.bannerText} numberOfLines={2}>
                        {topAlert.text}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bannerCta}>Open</Text>
                </Pressable>
              )}

              {page === 'dashboard' && snapshot && currentRole !== 'doctor' && weather && (
                <View style={styles.weatherCard}>
                  <View style={styles.weatherIconBubble}>
                    <Sun size={20} color={colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.weatherTitle}>Aktobe • {weather.temp}°C</Text>
                    <Text style={styles.weatherText}>
                      Contextual data: weather conditions can affect your daily biomarkers.
                    </Text>
                  </View>
                </View>
              )}

              {page === 'dashboard' && snapshot && (
                <View style={styles.activityCard}>
                  <View style={styles.activityCol}>
                    <Footprints size={24} color={colors.teal} />
                    <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 4}}>
                      <Text style={styles.activityVal}>{snapshot.activity.steps.toLocaleString()}</Text>
                      {currentRole === 'doctor' && (
                        <Pressable onPress={() => setEditModal({ visible: true, title: 'Steps', value: String(snapshot.activity.steps) })}>
                          <Pencil size={14} color={colors.teal} style={{marginBottom: 4}} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.activityLabel}>Steps Today</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityCol}>
                    <Flame size={24} color={colors.warn} />
                    <Text style={styles.activityVal}>{snapshot.activity.calories.toLocaleString()}</Text>
                    <Text style={styles.activityLabel}>kcal Burned</Text>
                  </View>
                  <View style={styles.activityDivider} />
                  <View style={styles.activityCol}>
                    <Zap size={24} color={colors.teal} />
                    <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 4}}>
                      <Text style={styles.activityVal}>{snapshot.activity.streak}</Text>
                      {currentRole === 'doctor' && (
                        <Pressable onPress={() => setEditModal({ visible: true, title: 'Streak', value: String(snapshot.activity.streak) })}>
                          <Pencil size={14} color={colors.teal} style={{marginBottom: 4}} />
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.activityLabel}>Day Streak</Text>
                  </View>
                </View>
              )}

              {page === 'dashboard' && snapshot && (
                <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
                  <BiomarkerCard
                    title="Blood Pressure"
                    value={`${snapshot.bp.sys ?? "-"}/${snapshot.bp.dia ?? "-"} mmHg`}
                    meta={`Pulse ${snapshot.bp.pulse ?? "-"} • ${snapshot.bp.updatedAt}`}
                    status={snapshot.bp.status}
                    deviceStatus={snapshot.bp.deviceStatus}
                    icon={<Activity size={18} color={colors.teal} strokeWidth={2.5} />}
                    progress={calcProgress(snapshot.bp.sys, 200)}
                    showEdit={currentRole === 'doctor'}
                    onEdit={() => setEditModal({ visible: true, title: 'Blood Pressure', value: `${snapshot.bp.sys ?? ""}/${snapshot.bp.dia ?? ""}` })}
                  />
                  <BiomarkerCard
                    title="Blood Glucose"
                    value={`${snapshot.glucose.value ?? "-"} ${snapshot.glucose.unit}`}
                    meta={`${snapshot.glucose.updatedAt}`}
                    status={snapshot.glucose.status}
                    deviceStatus={snapshot.glucose.deviceStatus}
                    icon={<Droplets size={18} color={colors.teal} strokeWidth={2.5} />}
                    progress={calcProgress(snapshot.glucose.value, 15)}
                    showEdit={currentRole === 'doctor'}
                    onEdit={() => setEditModal({ visible: true, title: 'Blood Glucose', value: String(snapshot.glucose.value ?? "") })}
                  />
                  <BiomarkerCard
                    title="SpO₂"
                    value={`${snapshot.spo2.value ?? "-"} %`}
                    meta={`${snapshot.spo2.updatedAt}`}
                    status={snapshot.spo2.status}
                    deviceStatus={snapshot.spo2.deviceStatus}
                    icon={<HeartPulse size={18} color={colors.teal} strokeWidth={2.5} />}
                    progress={calcProgress(snapshot.spo2.value, 100)}
                    showEdit={currentRole === 'doctor'}
                    onEdit={() => setEditModal({ visible: true, title: 'SpO₂', value: String(snapshot.spo2.value ?? "") })}
                  />
                  <BiomarkerCard
                    title="Heart Rate"
                    value={`${snapshot.hr.value ?? "-"} bpm`}
                    meta={`${snapshot.hr.updatedAt}`}
                    status={snapshot.hr.status}
                    deviceStatus={snapshot.hr.deviceStatus}
                    icon={<HeartPulse size={18} color={colors.teal} strokeWidth={2.5} />}
                    progress={calcProgress(snapshot.hr.value, 150)}
                    showEdit={currentRole === 'doctor'}
                    onEdit={() => setEditModal({ visible: true, title: 'Heart Rate', value: String(snapshot.hr.value ?? "") })}
                  />
                  <BiomarkerCard
                    title="Weight"
                    value={`${snapshot.weight.value ?? "-"} kg`}
                    meta={`BMI: ${snapshot.weight.bmi > 0 ? snapshot.weight.bmi : '-'} • ${snapshot.weight.updatedAt}`}
                    status={snapshot.weight.status}
                    deviceStatus={snapshot.weight.deviceStatus}
                    icon={<Activity size={18} color={colors.teal} strokeWidth={2.5} />}
                    progress={calcProgress(snapshot.weight.value, 150)}
                    showEdit={currentRole === 'doctor'}
                    onEdit={() => setEditModal({ visible: true, title: 'Weight', value: String(snapshot.weight.value ?? "") })}
                  />
                </View>
              )}

              {page === 'statistics' && snapshot && currentRole !== 'doctor' && (
                <View style={{ gap: 16 }}>
                  <Text style={styles.pageTitle}>Weekly Statistics</Text>

                  <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
                    <View style={styles.cardBase}>
                      <View style={styles.cardTop}>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
                          <View style={[styles.iconBubble, {backgroundColor: colors.tealSoft}]}>
                            <Footprints size={20} color={colors.teal} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Today's Steps</Text>
                            <Text style={styles.cardMeta}>Daily activity tracking</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.valueRow, { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
                        <Text style={styles.value}>{snapshot.activity.steps.toLocaleString()}</Text>
                        
                        <Pressable 
                          style={styles.downloadBtn} 
                          onPress={() => setEditModal({ visible: true, title: 'Steps', value: String(snapshot.activity.steps) })}
                        >
                          <Pencil size={14} color={colors.teal} />
                          <Text style={styles.downloadBtnText}>Log Steps</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.cardBase}>
                      <Text style={styles.cardTitle}>Steps History</Text>
                      <Text style={styles.cardMeta}>Your activity over the last 7 days</Text>

                      <View style={styles.chartContainer}>
                        {statistics.length > 0 ? statistics.map((stat, i) => {
                           const maxSteps = Math.max(...statistics.map(s => s.steps), 10000);
                           const heightPct = Math.min((stat.steps / maxSteps) * 100, 100);
                           return (
                             <View key={i} style={styles.chartCol}>
                               <Text style={styles.chartVal}>
                                 {stat.steps >= 1000 ? (stat.steps/1000).toFixed(1)+'k' : stat.steps}
                               </Text>
                               <View style={styles.chartBarBg}>
                                 <View style={[styles.chartBarFill, { height: `${heightPct}%` }]} />
                               </View>
                               <Text style={styles.chartLabel}>{stat.day_name}</Text>
                             </View>
                           );
                        }) : (
                          <Text style={styles.empty}>No data available yet.</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {page === 'achievements' && snapshot && currentRole !== 'doctor' && (
                <View style={{ gap: 10 }}>
                  <Text style={styles.pageTitle}>Achievements & Rewards</Text>
                  
                  <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
                    
                    <View style={styles.cardBase}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={[styles.iconBubble, {backgroundColor: colors.warnBg}]}>
                          <Zap size={24} color={colors.warn} />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.cardTitle}>{snapshot.activity.streak} Day Streak!</Text>
                          <Text style={styles.cardMeta}>Keep it up for 30 days to unlock the next rank</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardBase}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={[styles.iconBubble, {backgroundColor: snapshot.activity.steps >= 10000 ? colors.okBg : '#F1F6F7'}]}>
                          <Footprints size={24} color={snapshot.activity.steps >= 10000 ? colors.ok : colors.muted} />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.cardTitle}>Daily Goal Master</Text>
                          <Text style={styles.cardMeta}>
                            {snapshot.activity.steps >= 10000 
                              ? 'Goal reached! You are amazing!' 
                              : `Walk ${10000 - snapshot.activity.steps} more steps today`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardBase}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                        <View style={[styles.iconBubble, {backgroundColor: colors.tealSoft}]}>
                          <Award size={24} color={colors.teal} />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.cardTitle}>Lifetime Walker</Text>
                          <Text style={styles.cardMeta}>{totalLifetimeSteps.toLocaleString()} total steps across all days</Text>
                        </View>
                      </View>
                    </View>
                    
                  </View>

                  <Text style={[styles.pageTitle, { marginTop: 20 }]}>Step Milestones</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingVertical: 10 }}>
                    {MILESTONES.map((milestone) => (
                      <Pressable 
                        key={milestone.id} 
                        style={{ alignItems: 'center', gap: 8 }}
                        onPress={() => handleAchievementPress(milestone)}
                      >
                        <Image 
                          source={milestone.img} 
                          style={[styles.milestoneImage, totalLifetimeSteps < milestone.req && styles.milestoneLocked]} 
                        />
                        <Text style={styles.milestoneText}>{milestone.title}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {(page === 'dashboard' || page === 'achievements' || page === 'devices' || page === 'alerts' || page === 'statistics') && !snapshot && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.empty}>
                    {currentRole === 'doctor' && selectedPatientId
                      ? 'No health data available for this patient yet.' 
                      : 'No health metrics found.'}
                  </Text>
                  {currentRole === 'doctor' && selectedPatientId && (
                    <Pressable style={[styles.btnSave, {marginTop: 10, paddingHorizontal: 20}]} onPress={() => setEditModal({ visible: true, title: 'Heart Rate', value: '70' })}>
                      <Text style={styles.btnSaveText}>Add First Record</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {page === 'alerts' && snapshot && (
                <View style={{ gap: 10 }}>
                  <Text style={styles.pageTitle}>Alerts</Text>
                  {snapshot.alerts.length === 0 ? (
                    <Text style={styles.empty}>No active alerts.</Text>
                  ) : (
                    snapshot.alerts.map((a: any) => (
                      <View key={a.id} style={[styles.alertCard, levelCardStyle(a.level)]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                          <Text style={styles.alertTitle}>{a.title} • {a.time}</Text>
                          <View style={[styles.levelPill, levelPillStyle(a.level)]}>
                            <Text style={[styles.levelPillText, { color: levelColor(a.level) }]}>{a.level.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.alertText}>{a.text}</Text>
                        <Text style={styles.disclaimer}>Rule-based alert • Not medical advice.</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {page === 'devices' && snapshot && (
                <View style={{ gap: 10 }}>
                  <Text style={styles.pageTitle}>Devices</Text>
                  {snapshot.devices.map((d: any) => {
                    let DeviceIcon = Watch;
                    if (d.name === 'Pulse Oximeter') DeviceIcon = HeartPulse;
                    if (d.name === 'Glucose Monitor') DeviceIcon = Droplets;
                    if (d.name === 'HR Strap') DeviceIcon = Activity;

                    return (
                      <View key={d.id} style={styles.deviceCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={[styles.iconBubble, {backgroundColor: colors.tealSoft}]}>
                            <DeviceIcon size={20} color={colors.teal} />
                          </View>
                          
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.deviceName}>{d.name}</Text>
                              <View style={[styles.devicePill, devicePillStyle(d.status)]}>
                                {d.status === 'offline' ? <WifiOff size={14} color={colors.warn} /> : d.status === 'faulty' ? <AlertTriangle size={14} color={colors.crit} /> : <Watch size={14} color={colors.ok} />}
                                <Text style={[styles.devicePillText, { color: (devicePillStyle(d.status) as any).color }]}>{d.status.toUpperCase()}</Text>
                              </View>
                            </View>
                            <Text style={styles.deviceMeta}>Last seen: {d.lastSeen}</Text>
                            
                            <Pressable 
                              style={[styles.simulateBtn, faultedDevice === d.id && styles.simulateBtnActive]}
                              onPress={() => setFaultedDevice(faultedDevice === d.id ? null : d.id)}
                            >
                              <AlertTriangle size={12} color={faultedDevice === d.id ? '#fff' : colors.warn} />
                              <Text style={[styles.simulateBtnText, faultedDevice === d.id && {color: '#fff'}]}>
                                {faultedDevice === d.id ? 'Fix Device' : 'Simulate Fault'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {page === 'doctor' && (
                <View style={{ gap: 10 }}>
                  <Text style={styles.pageTitle}>Patients Directory</Text>
                  {currentRole !== 'doctor' ? (
                    <Text style={styles.empty}>Switch role to Doctor to see clinician dashboard.</Text>
                  ) : patients.length === 0 ? (
                    <Text style={styles.empty}>No patients registered yet.</Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.muted}>Select a patient to view their detailed metrics.</Text>
                      <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
                        {patients.map((patient) => {
                          const pStatus = getPatientStatus(patient.metrics);
                          return (
                            <Pressable 
                              key={patient.id} 
                              style={[styles.cardBase, levelCardStyle(pStatus)]} 
                              onPress={() => {
                                setSelectedPatientId(patient.id);
                                setPage('dashboard');
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.cardTitle}>{patient.first_name} {patient.last_name}</Text>
                                <View style={[styles.levelPill, levelPillStyle(pStatus)]}>
                                  <Text style={[styles.levelPillText, { color: levelColor(pStatus) }]}>{pStatus.toUpperCase()}</Text>
                                </View>
                              </View>
                              <Text style={styles.cardMeta}>ID: {patient.id} • View metrics</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>

        <Modal visible={achModal.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.achModalContent}>
              <Pressable onPress={() => setAchModal({ visible: false, data: null })} style={styles.achCloseBtn}>
                <X size={24} color={colors.muted} />
              </Pressable>
              
              {achModal.data && (
                <>
                  <Image source={achModal.data.img} style={styles.achModalImage} />
                  <Text style={styles.achModalTitle}>{achModal.data.title} Unlocked!</Text>
                  <Text style={styles.achModalDesc}>{achModal.data.desc}</Text>
                  
                  <Pressable 
                    style={styles.achShareBtn} 
                    onPress={() => handleShareAchievement(achModal.data.title)}
                  >
                    <Share2 size={18} color="#fff" />
                    <Text style={styles.achShareBtnText}>Share Achievement</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={editModal.visible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit {editModal.title}</Text>
              <Text style={styles.modalSub}>
                {editModal.title === 'Blood Pressure' ? 'Enter as SYS/DIA (e.g. 120/80)' : 'Enter numerical value:'}
              </Text>
              
              <TextInput
                style={styles.input}
                value={editModal.value}
                onChangeText={(text) => setEditModal({ ...editModal, value: text })}
                keyboardType="numbers-and-punctuation"
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.btnCancel} onPress={() => setEditModal({ visible: false, title: '', value: '' })}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.btnSave} onPress={handleSaveEdit}>
                  <Text style={styles.btnSaveText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

function BiomarkerCard(props: { title: string; value: string; meta: string; status: Level; deviceStatus: DeviceStatus; icon: React.ReactNode; progress: number; showEdit?: boolean; onEdit?: () => void; }) {
  const { title, value, meta, status, deviceStatus, icon, progress, showEdit, onEdit } = props;
  return (
    <View style={styles.cardBase}>
      <View style={styles.cardTop}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 }}>
          <View style={styles.iconBubble}>{icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardMeta}>{meta}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.levelPill, levelPillStyle(status)]}>
            <Text style={[styles.levelPillText, { color: levelColor(status) }]}>{status.toUpperCase()}</Text>
          </View>
          <View style={[styles.devicePill, devicePillStyle(deviceStatus)]}>
            {deviceStatus === 'offline' ? <WifiOff size={14} color={colors.warn} /> : deviceStatus === 'faulty' ? <AlertTriangle size={14} color={colors.crit} /> : <Watch size={14} color={colors.ok} />}
            <Text style={[styles.devicePillText, { color: (devicePillStyle(deviceStatus) as any).color }]}>
              {deviceLabel(deviceStatus)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.valueRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
        <Text style={styles.value}>{value}</Text>
        
        {showEdit && (
          <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 }}>
            <Pencil size={14} color={colors.teal} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.teal }}>Edit</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.barBg}>
        <View style={[ styles.barFill, { backgroundColor: levelColor(status), width: `${progress}%`, }, ]} />
      </View>
      <Text style={styles.hint}>Tap for history & details</Text>
    </View>
  );
}

function getPatientStatus(metrics: any): Level {
  if (!metrics) return 'normal';
  
  const bp = evalBP({ 
    sys: metrics.systolic_bp != null ? Number(metrics.systolic_bp) : null, 
    dia: metrics.diastolic_bp != null ? Number(metrics.diastolic_bp) : null, 
    deviceStatus: 'ok' 
  });
  const gl = evalGlucose({ 
    value: metrics.blood_glucose != null ? Number(metrics.blood_glucose) : null, 
    deviceStatus: 'ok' 
  });
  const sp = evalSpO2({ 
    value: metrics.spo2 != null ? Number(metrics.spo2) : null, 
    deviceStatus: 'ok' 
  });
  const hr = evalHR({ 
    value: metrics.heart_rate != null ? Number(metrics.heart_rate) : null, 
    deviceStatus: 'ok' 
  });

  if (bp === 'critical' || gl === 'critical' || sp === 'critical' || hr === 'critical') return 'critical';
  if (bp === 'warning' || gl === 'warning' || sp === 'warning' || hr === 'warning') return 'warning';
  return 'normal';
}

function calcProgress(val: number | null, max: number): number {
  if (val == null) return 0;
  const p = (val / max) * 100;
  return Math.min(Math.max(p, 5), 100);
}

function evalBP(bp: { sys: number | null; dia: number | null; deviceStatus: DeviceStatus }): Level {
  if (bp.deviceStatus === 'offline') return 'warning';
  if (bp.deviceStatus === 'faulty') return 'critical';
  if (bp.sys == null || bp.dia == null) return 'normal';
  if (bp.sys >= 180 || bp.dia >= 120) return 'critical';
  if (bp.sys >= 140 || bp.dia >= 90) return 'warning';
  return 'normal';
}
function evalGlucose(g: { value: number | null; deviceStatus: DeviceStatus }): Level {
  if (g.deviceStatus === 'offline') return 'warning';
  if (g.deviceStatus === 'faulty') return 'critical';
  if (g.value == null) return 'normal';
  if (g.value >= 13) return 'critical';
  if (g.value >= 7.8) return 'warning';
  return 'normal';
}
function evalSpO2(s: { value: number | null; deviceStatus: DeviceStatus }): Level {
  if (s.deviceStatus === 'offline') return 'warning';
  if (s.deviceStatus === 'faulty') return 'critical';
  if (s.value == null) return 'normal';
  if (s.value < 92) return 'critical';
  if (s.value < 95) return 'warning';
  return 'normal';
}
function evalHR(h: { value: number | null; deviceStatus: DeviceStatus }): Level {
  if (h.deviceStatus === 'offline') return 'warning';
  if (h.deviceStatus === 'faulty') return 'critical';
  if (h.value == null) return 'normal';
  if (h.value >= 130 || h.value < 40) return 'warning';
  return 'normal';
}

function evalWeight(w: { value: number | null; bmi: number; deviceStatus: DeviceStatus }): Level {
  if (w.deviceStatus === 'offline') return 'warning';
  if (w.deviceStatus === 'faulty') return 'critical';
  if (w.value == null || w.bmi === 0) return 'normal'; 

  if (w.bmi < 16.0 || w.bmi >= 35.0) return 'critical'; 
  if (w.bmi < 18.5 || w.bmi >= 25.0) return 'warning'; 
  
  return 'normal'; 
}

function buildAlerts(values: any, st: any) {
  const alerts: Array<{ id: string; level: Level; title: string; text: string; time: string }> = [];
  const add = (level: Level, title: string, text: string, time: string) =>
    alerts.push({ id: `${title}-${time}-${Math.random()}`, level, title, text, time });

  if (values.activity && values.activity.steps >= 1000000) {
    add('critical', 'Sensor Fault', 'Smart Watch reported unrealistic step count (1,000,000+). Hardware error detected.', values.bp.updatedAt);
  }

  if (st.weightStatus === 'critical') {
      if (values.weight.bmi >= 35.0) add('critical', 'Critical Weight', 'BMI indicates Class II+ Obesity. Consult a doctor for a health plan.', values.weight.updatedAt);
      if (values.weight.bmi < 16.0) add('critical', 'Critical Weight', 'BMI indicates severe underweight. Medical attention recommended.', values.weight.updatedAt);
  }
  if (st.weightStatus === 'warning') {
      if (values.weight.bmi >= 25.0) add('warning', 'Weight Alert', 'BMI indicates overweight status. Consider adjusting diet/activity.', values.weight.updatedAt);
      if (values.weight.bmi < 18.5) add('warning', 'Weight Alert', 'BMI indicates underweight status. Monitor nutritional intake.', values.weight.updatedAt);
  }

  if (values.bp.deviceStatus === 'faulty') add('critical', 'Device fault', 'Smart Watch is reporting abnormal blood pressure readings. Please verify the device.', values.bp.updatedAt);
  if (values.spo2.deviceStatus === 'faulty') add('critical', 'Device fault', 'Pulse Oximeter is reporting abnormally low oxygen levels. Check sensor placement.', values.spo2.updatedAt);
  if (values.glucose.deviceStatus === 'faulty') add('critical', 'Device fault', 'Glucose monitor reported faulty readings. Verify device calibration.', values.glucose.updatedAt);
  if (values.hr.deviceStatus === 'faulty') add('critical', 'Device fault', 'HR Strap is reporting dangerous heart rates. Re-attach or restart device.', values.hr.updatedAt);

  if (values.hr.deviceStatus === 'offline') add('warning', 'Device offline', 'Heart-rate device is offline. Data may be incomplete.', '09:15');

  if (st.bpStatus === 'critical' && values.bp.deviceStatus !== 'faulty') add('critical', 'Critical reading', 'Blood Pressure is high. Repeat measurement and consider contacting a clinician.', values.bp.updatedAt);
  if (st.bpStatus === 'warning' && values.bp.deviceStatus !== 'faulty') add('warning', 'Warning reading', 'Blood Pressure is outside normal range.', values.bp.updatedAt);

  if (st.spo2Status === 'critical' && values.spo2.deviceStatus !== 'faulty') add('critical', 'Critical reading', 'SpO₂ is low. Re-check and seek help if symptoms occur.', values.spo2.updatedAt);
  if (st.spo2Status === 'warning' && values.spo2.deviceStatus !== 'faulty') add('warning', 'Warning reading', 'SpO₂ slightly below normal.', values.spo2.updatedAt);

  if (st.glucoseStatus === 'warning' && values.glucose.deviceStatus !== 'faulty') add('warning', 'Warning reading', 'Glucose slightly elevated. Re-check after rest.', values.glucose.updatedAt);
  if (st.glucoseStatus === 'critical' && values.glucose.deviceStatus !== 'faulty') add('critical', 'Critical reading', 'Glucose is in critical range. Re-check and seek medical guidance.', values.glucose.updatedAt);

  return alerts.reverse().slice(0, 6);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  sidebar: { width: 220, backgroundColor: '#EDF7F7', borderRightWidth: 1, borderRightColor: '#DCEAEC', padding: 16 },
  brand: { fontSize: 18, fontWeight: '900', color: colors.teal },
  brandSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#567A80' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  navItemActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#CBE3E6' },
  navIcon: { width: 26, alignItems: 'center' },
  navText: { fontSize: 13, fontWeight: '900', color: colors.text },
  smallLabel: { fontSize: 12, fontWeight: '800', color: '#567A80', marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.tealSoft, borderWidth: 1.5, borderColor: '#CBE3E6', alignItems: 'center' },
  pillOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillText: { fontWeight: '900', color: colors.teal },
  pillTextOn: { color: '#fff' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#CBE3E6' },
  chipOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: '900', color: colors.teal },
  chipTextOn: { color: '#fff' },
  notice: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: '#F1F6F7', borderWidth: 1.5, borderColor: '#DCEAEC' },
  noticeTitle: { fontWeight: '900', color: colors.text, marginBottom: 4 },
  noticeText: { fontSize: 12, fontWeight: '700', color: '#567A80' },
  main: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hTitle: { fontSize: 28, fontWeight: '900', color: colors.teal, letterSpacing: -0.7 },
  hSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#567A80' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  dot: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF3B30', borderWidth: 2, borderColor: '#fff' },
  mobileTabs: { flexDirection: 'row', gap: 8 },
  mTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.tealSoft, borderWidth: 1.5, borderColor: '#CBE3E6', alignItems: 'center', marginRight: 8 },
  mTabOn: { backgroundColor: colors.teal, borderColor: colors.teal },
  mTabText: { fontWeight: '900', color: colors.teal, fontSize: 12 },
  mTabTextOn: { color: '#fff' },
  banner: { borderRadius: 18, padding: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  bannerWarn: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  bannerCrit: { backgroundColor: colors.critBg, borderColor: colors.critBorder },
  bannerTitle: { fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 4 },
  bannerText: { fontSize: 12, fontWeight: '700', color: '#3B5458' },
  bannerCta: { fontSize: 12, fontWeight: '900', color: colors.teal },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridMobile: { flexDirection: 'column', gap: 12 },
  cardBase: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: colors.border, ...Platform.select({ web: { flex: 1, minWidth: '45%' as any }, default: { width: '100%' } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.okBg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  cardMeta: { marginTop: 3, fontSize: 12, fontWeight: '700', color: colors.muted },
  levelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, backgroundColor: '#fff' },
  levelPillText: { fontSize: 11, fontWeight: '900' },
  devicePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5 },
  devicePillText: { fontSize: 11, fontWeight: '900' },
  valueRow: { marginBottom: 10 },
  value: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.6 },
  barBg: { height: 10, backgroundColor: '#EEF3F6', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%' },
  hint: { marginTop: 10, fontSize: 11, fontWeight: '800', color: '#7A8F94' },
  pageTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 },
  emptyContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  empty: { fontSize: 13, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  alertCard: { padding: 14, borderRadius: 16, borderWidth: 1.5, backgroundColor: '#fff' },
  alertTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  alertText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#3B5458' },
  disclaimer: { marginTop: 8, fontSize: 11, fontWeight: '700', color: colors.muted },
  deviceCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, padding: 14 },
  deviceName: { fontWeight: '900', color: colors.text },
  deviceMeta: { marginTop: 6, fontSize: 12, fontWeight: '700', color: colors.muted },
  muted: { fontSize: 12, fontWeight: '700', color: colors.muted },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(32, 54, 58, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 300, backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: '#E8EEF2' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.teal, marginBottom: 6 },
  modalSub: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 16 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#DCEAEC', borderRadius: 14, padding: 14, fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: '#F1F6F7', alignItems: 'center' },
  btnCancelText: { fontWeight: '800', color: '#567A80' },
  btnSave: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center' },
  btnSaveText: { fontWeight: '900', color: '#fff' },

  achModalContent: { width: 320, backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8EEF2' },
  achCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  achModalImage: { width: 140, height: 140, resizeMode: 'contain', marginBottom: 16 },
  achModalTitle: { fontSize: 22, fontWeight: '900', color: colors.teal, textAlign: 'center', marginBottom: 8 },
  achModalDesc: { fontSize: 14, fontWeight: '700', color: '#567A80', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  achShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.teal, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 },
  achShareBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  chatContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden', marginTop: 10 },
  chatList: { padding: 16, gap: 12, flexGrow: 1 },
  chatBubble: { maxWidth: '85%', padding: 14, borderRadius: 18 },
  chatUser: { alignSelf: 'flex-end', backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  chatAi: { alignSelf: 'flex-start', backgroundColor: '#F1F6F7', borderWidth: 1.5, borderColor: '#DCEAEC', borderBottomLeftRadius: 4 },
  chatTextUser: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chatTextAi: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  chatInputArea: { flexDirection: 'row', padding: 12, borderTopWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', gap: 10 },
  chatInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#DCEAEC', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: colors.text },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  
  downloadIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#DCEAEC' },
  
  weatherCard: { backgroundColor: '#EAF6F7', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#DCEAEC', flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  weatherIconBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  weatherTitle: { fontSize: 14, fontWeight: '900', color: colors.teal, marginBottom: 2 },
  weatherText: { fontSize: 12, fontWeight: '700', color: '#567A80' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#DCEAEC' },
  downloadBtnText: { fontSize: 12, fontWeight: '800', color: colors.teal },

  simulateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.warnBg, borderWidth: 1.5, borderColor: colors.warnBorder, borderRadius: 8, alignSelf: 'flex-start' },
  simulateBtnActive: { backgroundColor: colors.crit, borderColor: colors.crit },
  simulateBtnText: { fontSize: 11, fontWeight: '800', color: colors.warn },

  activityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#DCEAEC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activityCol: { flex: 1, alignItems: 'center', gap: 4 },
  activityVal: { fontSize: 20, fontWeight: '900', color: colors.text },
  activityLabel: { fontSize: 11, fontWeight: '800', color: '#567A80' },
  activityDivider: { width: 1.5, height: 40, backgroundColor: '#E8EEF2' },

  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: { width: 38, height: 38, borderRadius: 10 },

  milestoneImage: { width: 115, height: 115, resizeMode: 'contain' },
  milestoneLocked: { opacity: 0.3 },
  milestoneText: { fontSize: 13, fontWeight: '800', color: colors.text },

  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 180, marginTop: 16, paddingTop: 10, borderTopWidth: 1.5, borderColor: colors.border },
  chartCol: { alignItems: 'center', flex: 1 },
  chartVal: { fontSize: 10, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  chartBarBg: { width: 24, height: 100, backgroundColor: '#E8EEF2', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill: { width: '100%', backgroundColor: colors.teal, borderRadius: 6 },
  chartLabel: { fontSize: 11, fontWeight: '800', color: colors.text, marginTop: 8 },
});