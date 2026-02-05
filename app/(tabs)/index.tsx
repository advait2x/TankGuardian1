import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  AlertTriangle, 
  CheckCircle, 
  Droplets, 
  ChevronRight,
  Clock,
  TrendingUp,
  Info,
  Bell,
  Plus
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import MascotIcon from '@/components/mascot/MascotIcon';
import { useMascot } from '@/components/mascot/MascotContext';
import { useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/store/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, tanks, selectedTankId, tasks, completeTask } = useApp();
  const { showToast } = useToast();
  const { showMascot, hideMascot } = useMascot();
  const { colors, activeTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const selectedTank = tanks.find(t => t.id === selectedTankId);
  const tankTasks = tasks.filter(t => t.tankId === selectedTankId);
  const todayTasks = tankTasks.filter(task => {
    const dueDate = new Date(task.nextDueAt);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  // Calculate risk level
  const overdueTasks = tankTasks.filter(t => new Date(t.nextDueAt) < new Date());
  const riskScore = Math.min(100, overdueTasks.length * 25);
  const riskLevel = riskScore <= 25 ? 'low' : riskScore <= 50 ? 'medium' : 'high';

  useEffect(() => {
    // Show mascot on home screen with tasks briefly
    if (todayTasks.length > 0) {
      showMascot('checklist', 'bottom-right', 'Tap a task to complete it!', 3000);
    } else {
      showMascot('guide', 'bottom-right', undefined, 2500);
    }
    return () => {
      hideMascot();
    };
  }, [todayTasks.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(taskId);
    showToast('Task completed — nice work!', 'success');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedBackground variant={activeTheme === 'dark' ? 'dark' : 'light'} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{currentUser?.displayName || 'Aquarist'} 👋</Text>
            </View>
            <View style={[styles.tankSelector, { backgroundColor: colors.tankBackground }]}>
              <Text style={[styles.tankName, { color: colors.primaryLight }]}>{selectedTank?.name || 'No tank'}</Text>
            </View>
          </Animated.View>

          {/* Risk Meter Card */}
          {selectedTank && (
            <GlassCard style={[styles.riskCard, { backgroundColor: colors.card }]} delay={100}>
              <View style={styles.riskHeader}>
                <View style={styles.riskLabelContainer}>
                  <Text style={[styles.riskLabel, { color: colors.text }]}>Tank Health</Text>
                  <TouchableOpacity 
                    onPress={() => setShowRiskModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Badge 
                  label={riskLevel === 'low' ? 'Stable' : riskLevel === 'medium' ? 'Attention needed' : 'Action required'}
                  variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}
                />
              </View>
              
              <ProgressBar 
                progress={100 - riskScore} 
                variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}
                height={10}
              />
              
              <Text style={[styles.riskMessage, { color: colors.textSecondary }]}>
                {riskLevel === 'low' 
                  ? "Nice — your tank looks stable today."
                  : riskLevel === 'medium'
                  ? "A few tasks need your attention."
                  : "Your tank needs immediate attention!"}
              </Text>
            </GlassCard>
          )}

          {/* Today's Tasks */}
          <Animated.View entering={FadeInDown.delay(100).duration(220)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/mytank')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {todayTasks.length === 0 ? (
              <GlassCard style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <View style={styles.emptyContent}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up! 🎉</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks due today. Your fish are happy.</Text>
                </View>
              </GlassCard>
            ) : (
              <View style={styles.tasksList}>
                {todayTasks.slice(0, 3).map((task, index) => (
                  <GlassCard key={task.id} style={[styles.taskCard, { backgroundColor: colors.card }]} delay={250 + index * 50}>
                    <TouchableOpacity 
                      style={styles.taskContent}
                      onPress={() => handleCompleteTask(task.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.type) + '20' }]}>
                        {getTaskIcon(task.type)}
                      </View>
                      <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <Clock size={12} color={colors.textSecondary} />
                          <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
                            {task.frequencyConfig.timeOfDay || 'Anytime'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.completeButton}>
                        <CheckCircle size={24} color="#4ECDC4" />
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Suggested Actions */}
          <Animated.View entering={FadeInDown.delay(180).duration(220)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested Actions</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsScrollContent}
            >
              <GlassCard style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/(tabs)/mytank')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                  <Droplets size={24} color="#4ECDC4" />
                </View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Log Water Test</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Track your parameters</Text>
              </GlassCard>

              <GlassCard style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/(tabs)/catalog')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.2)' }]}>
                  <MascotIcon variant="search" size={64} />
                </View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Add Fish</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Browse compatible species</Text>
              </GlassCard>

              <GlassCard style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/(tabs)/community')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(13, 115, 119, 0.2)' }]}>
                  <TrendingUp size={24} color="#0D7377" />
                </View>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Get Inspired</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Browse community tanks</Text>
              </GlassCard>
            </ScrollView>
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Risk Modal */}
      <Modal
        visible={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        title="Tank Health Score"
        size="medium"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Your tank health score is based on:
          </Text>
          <View style={styles.modalList}>
            <Text style={styles.modalListItem}>• Overdue tasks ({overdueTasks.length})</Text>
            <Text style={styles.modalListItem}>• Fish stocking levels</Text>
            <Text style={styles.modalListItem}>• Water test frequency</Text>
            <Text style={styles.modalListItem}>• Compatibility alerts</Text>
          </View>
          <Text style={styles.modalText}>
            Complete your tasks regularly to maintain a healthy tank!
          </Text>
          <Button 
            title="Got it" 
            onPress={() => setShowRiskModal(false)}
            variant="primary"
            fullWidth
          />
        </View>
      </Modal>
    </View>
  );
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'feed':
      return <MascotIcon variant="checklist" size={56} withHalo={false} />;
    case 'water_change':
      return <Droplets size={32} color="#4ECDC4" />;
    case 'test':
      return <TrendingUp size={32} color="#0D7377" />;
    case 'maintenance':
      return <AlertTriangle size={32} color="#FFA726" />;
    default:
      return <CheckCircle size={32} color="#0D7377" />;
  }
}

function getTaskColor(type: string) {
  switch (type) {
    case 'feed':
      return '#FF6B35';
    case 'water_change':
      return '#4ECDC4';
    case 'test':
      return '#0D7377';
    case 'maintenance':
      return '#FFA726';
    default:
      return '#0D7377';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
  },
  tankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tankName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D7377',
  },
  riskCard: {
    marginBottom: 24,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
  },
  riskMessage: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
  },
  emptyCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  tasksList: {
    gap: 10,
    marginBottom: 24,
  },
  taskCard: {
    padding: 14,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTime: {
    fontSize: 12,
    color: '#64748B',
  },
  completeButton: {
    padding: 4,
  },
  actionsScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  actionCard: {
    width: 140,
    padding: 14,
    marginBottom: 24,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
  },
  postTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  postText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 10,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    fontSize: 13,
    color: '#64748B',
  },
  bottomPadding: {
    height: 20,
  },
  mascotContainer: {
    position: 'absolute',
    bottom: 100,
    right: 80,
  },
  modalContent: {
    gap: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  modalList: {
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 12,
    padding: 14,
  },
  modalListItem: {
    fontSize: 14,
    color: '#2C3E50',
    paddingVertical: 4,
  },
});
